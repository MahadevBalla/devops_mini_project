# Deployment

This document explains how AI Money Mentor is deployed in this repository, what is running on the server, and where each part of the process is managed.

If you want system-level design details, refer to `docs/ARCHITECTURE.md`.

## Table of Contents

- [Deployment Overview](#deployment-overview)
- [What Actually Runs on the EC2 Host](#what-actually-runs-on-the-ec2-host)
- [1. Infrastructure Provisioning (Terraform)](#1-infrastructure-provisioning-terraform)
- [2. Server Configuration (Ansible)](#2-server-configuration-ansible)
- [3. CI/CD Pipeline (Jenkins)](#3-cicd-pipeline-jenkins)
- [4. Runtime Stack (Docker Compose)](#4-runtime-stack-docker-compose)
- [5. Monitoring Setup](#5-monitoring-setup)
- [6. Operations Checklist](#6-operations-checklist)
- [7. What Was Kept, Reduced, and Changed in This Doc](#7-what-was-kept-reduced-and-changed-in-this-doc)
- [8. Recommended Next Improvements (Best Practices)](#8-recommended-next-improvements-best-practices)

## Deployment Overview

This project uses an EC2-based deployment flow:

1. Terraform provisions the EC2 instance and security group.
2. Ansible prepares the host, installs Docker, and copies runtime files.
3. Ansible starts Jenkins and SonarQube as containers.
4. Jenkins runs tests, performs SonarQube analysis, builds and pushes Docker images, and redeploys with Docker Compose.
5. The Compose stack runs backend, frontend, and monitoring services.

In simple terms: Terraform creates the machine, Ansible prepares it, Jenkins ships updates.

## What Actually Runs on the EC2 Host

There are two groups of containers:

- CI/CD and quality tooling:
  - Jenkins on port `8080`
  - SonarQube on port `9000`
- Application and monitoring stack (via Compose):
  - Backend on port `8000`
  - Frontend on port `3000`
  - Prometheus on port `9090`
  - Grafana on port `3001`
  - node-exporter (internal scrape target)
  - cAdvisor (internal scrape target)

Important clarification:

- `node-exporter` and `cAdvisor` are not part of Grafana.
- They are standalone exporters that Prometheus scrapes.
- Grafana only visualizes metrics by querying Prometheus.

So yes, they are related to the Prometheus/Grafana monitoring stack, but they are separate services and worth one clear mention.

## 1. Infrastructure Provisioning (Terraform)

Terraform files are in `terraform/`.

### Defaults and Inputs

- Region default: `ap-south-1`
- AMI default: `ami-0f58b397bc5c1f2e8` (Ubuntu 24.04 in `ap-south-1`)
- Required inputs:
  - `key_name`
  - `allowed_ssh_cidr`

### Main Resources

- `aws_instance.money_mentor`
  - Type: `m7i-flex.large`
  - Root volume: `25 GB gp3`
  - Metadata tokens: required
- `aws_security_group.mm_sg`
  - Open ports: `22`, `3000`, `3001`, `8000`, `8080`, `9000`, `9090`

### Outputs

Terraform outputs include:

- `ec2_public_ip`, `ec2_public_dns`
- `backend_url`, `frontend_url`
- `jenkins_url`, `sonarqube_url`, `grafana_url`
- `ec2_instance_id`

## 2. Server Configuration (Ansible)

Ansible files are in `ansible/`.

The playbook `ansible/setup.yml` does the following:

- installs Docker Engine and Docker Compose plugin
- sets baseline packages (`curl`, `git`, `htop`, etc.)
- configures Docker log rotation
- creates a 2 GB swap file
- sets `vm.max_map_count=262144` for SonarQube
- creates `/home/ubuntu/app` runtime directories
- copies deployment files into `/home/ubuntu/app`
- starts Jenkins container
- starts SonarQube container

### Runtime files copied by Ansible

- `docker-compose.prod.yml` -> `/home/ubuntu/app/docker-compose.yml`
- `monitoring/prometheus.yml` -> `/home/ubuntu/app/monitoring/prometheus.yml`
- `monitoring/grafana/datasources.yml` -> `/home/ubuntu/app/monitoring/grafana/datasources.yml`

### Important note

The playbook does not create `/home/ubuntu/app/.env`.
You must create that file on the server with production values before deployment.

## 3. CI/CD Pipeline (Jenkins)

Pipeline file: `Jenkinsfile`.

### Stages

1. Checkout
2. Backend install and test with `uv`
3. Lint with Ruff
4. SonarQube analysis
5. Quality gate check
6. Docker build and push
7. Deploy with Compose
8. Health check

### Behavior that matters

- Lint is non-blocking (`ruff ... || true`).
- Quality gate is non-blocking (`abortPipeline: false`).
- Backend and frontend images are tagged with `latest` and `${BUILD_NUMBER}`.
- Deployment runs:

```bash
docker compose -f /home/ubuntu/app/docker-compose.yml pull
docker compose -f /home/ubuntu/app/docker-compose.yml up -d --remove-orphans
docker image prune -f
```

- Health check verifies: `http://${EC2_HOST}:8000/health`

### Deployment model detail

Jenkins is running as a container on the same EC2 host and uses the host Docker socket.
So Compose deployment happens on that host directly, not through a separate SSH deployment step.

## 4. Runtime Stack (Docker Compose)

Two compose files exist:

- `docker-compose.yml`: local source build
- `docker-compose.prod.yml`: production runtime using pushed images

Ansible copies `docker-compose.prod.yml` into `/home/ubuntu/app/docker-compose.yml`.

### Backend service (production)

- image: `mahadevballa/mm-backend:latest`
- port: `8000:8000`
- reads env from `.env`
- DB path forced to SQLite at `/app/data/money_mentor.db`
- health check on `/health`

### Frontend service (production)

- image: `mahadevballa/mm-frontend:latest`
- port: `3000:3000`

Important build-time behavior:

- `NEXT_PUBLIC_API_URL` is baked into the frontend image at build time.
- In the current Jenkinsfile, the frontend build does not pass a custom value, so Dockerfile default is used (`http://localhost:8000`).

### Monitoring services

- Prometheus (`9090`)
- Grafana (`3001`)
- node-exporter (host metrics target)
- cAdvisor (container metrics target)

### Persistent volumes

- `backend_data`
- `prometheus_data`
- `grafana_data`
- `jenkins_home`

## 5. Monitoring Setup

Prometheus config is in `monitoring/prometheus.yml` and currently scrapes:

- backend metrics at `/metrics`
- node-exporter
- cAdvisor
- Prometheus itself

Grafana datasource provisioning is in `monitoring/grafana/datasources.yml` and points to:

- `http://prometheus:9090`

No dashboard provisioning files are currently included.

## 6. Operations Checklist

Before first deployment, make sure these are in place:

1. Terraform applied and EC2 reachable.
2. Ansible setup completed.
3. `/home/ubuntu/app/.env` exists with production values.
4. Jenkins credentials configured:
   - `dockerhub-creds`
   - `ec2-host`
   - SonarQube server named `SonarQube`

Useful runtime URLs:

- Frontend: `http://<ec2-ip>:3000`
- Backend: `http://<ec2-ip>:8000`
- Backend health: `http://<ec2-ip>:8000/health`
- Backend metrics: `http://<ec2-ip>:8000/metrics`
- Jenkins: `http://<ec2-ip>:8080`
- SonarQube: `http://<ec2-ip>:9000`
- Prometheus: `http://<ec2-ip>:9090`
- Grafana: `http://<ec2-ip>:3001`

## 7. What Was Kept, Reduced, and Changed in This Doc

This is the style and content policy used for this version.

### Kept

- exact deployment flow and ownership across Terraform/Ansible/Jenkins/Compose
- real ports and service boundaries
- concrete pipeline behavior that affects release reliability

### Reduced

- repeated values that appeared in multiple sections
- large tables where short bullets are clearer
- duplicated deployment command explanations

### Changed

- monitoring is explained in plain language
- `node-exporter` and `cAdvisor` are mentioned once with clear purpose
- tone is intentionally closer to the backend README style (explanatory, direct, less formal)

## 8. Recommended Next Improvements (Best Practices)

If you want to harden this setup further, prioritize these:

1. Put Jenkins, SonarQube, Prometheus, and Grafana behind restricted access (VPN, allowlist, or private subnet).
2. Add TLS + reverse proxy for public endpoints instead of exposing many raw ports.
3. Make lint and quality gate blocking once baseline issues are cleaned up.
4. Add persistent volume for SonarQube data.
5. Pass `NEXT_PUBLIC_API_URL` explicitly during frontend image build in CI.
6. Move Terraform state to a remote backend (for team-safe state and locking).
7. Move secrets to a managed secret store (for example, AWS SSM or Secrets Manager) instead of relying on manual `.env` creation.
