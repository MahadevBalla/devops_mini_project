pipeline {
    agent any

    environment {
        DOCKERHUB_USER   = 'mahadevballa'
        BACKEND_IMAGE    = "${DOCKERHUB_USER}/mm-backend"
        FRONTEND_IMAGE   = "${DOCKERHUB_USER}/mm-frontend"
        SONAR_PROJECT    = 'money-mentor'
    }

    stages {

        stage('Checkout') {
            steps {
                echo '─────────────────── Cloning repository ───────────────────'
                checkout scm
            }
        }

        stage('Backend: Install & Test') {
            steps {
                echo '─────────────────── Running backend unit tests with uv ───────────────────'
                dir('backend') {
                    sh '''
                        # Install uv if not present (persists in Jenkins home volume)
                        command -v uv >/dev/null 2>&1 || \
                            curl -LsSf https://astral.sh/uv/install.sh | sh
                        export PATH="$HOME/.local/bin:$PATH"

                        # Sync deps (uses uv.lock for reproducibility)
                        uv sync --locked --group dev

                        # Run deterministic finance tests — no LLM/DB/network needed
                        uv run pytest \
                            tests/test_finance.py \
                            tests/test_fire_stepup.py \
                            tests/test_life_event.py \
                            tests/test_mf_xray.py \
                            tests/test_couple.py \
                            --tb=short -v \
                            --cov=. \
                            --cov-report=xml:coverage.xml \
                            --cov-report=term-missing
                    '''
                }
            }
            post {
                always {
                    // Archive coverage report for SonarQube
                    archiveArtifacts artifacts: 'backend/coverage.xml', allowEmptyArchive: true
                }
            }
        }

        stage('Lint') {
            steps {
                echo '─────────────────── Linting with ruff ───────────────────'
                dir('backend') {
                    sh '''
                        export PATH="$HOME/.local/bin:$PATH"
                        uv run ruff check . --output-format=full || true
                    '''
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                echo '─────────────────── Running SonarQube code quality scan ───────────────────'
                withSonarQubeEnv('SonarQube') {
                    sh '''
                        export PATH="/usr/local/bin:$HOME/.local/bin:$PATH"
                        sonar-scanner \
                          -Dsonar.projectKey=${SONAR_PROJECT} \
                          -Dsonar.projectName="AI Money Mentor" \
                          -Dsonar.sources=backend \
                          -Dsonar.tests=backend/tests \
                          -Dsonar.python.version=3.13 \
                          -Dsonar.python.coverage.reportPaths=backend/coverage.xml \
                          -Dsonar.exclusions=**/node_modules/**,**/__pycache__/**,**/.venv/**,**/.next/**
                    '''
                }
            }
        }

        stage('Quality Gate') {
            steps {
                echo '─────────────────── Waiting for SonarQube Quality Gate ───────────────────'
                timeout(time: 5, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: false
                }
            }
        }

        stage('Docker Build & Push') {
            steps {
                echo '─────────────────── Building Docker images and pushing to Docker Hub ───────────────────'
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    sh '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin

                        # Build with compose (respects both Dockerfiles)
                        docker compose build --no-cache

                        # Tag for Docker Hub
                        docker tag devops_mini_project-backend  ${BACKEND_IMAGE}:latest
                        docker tag devops_mini_project-frontend ${FRONTEND_IMAGE}:latest
                        docker tag devops_mini_project-backend  ${BACKEND_IMAGE}:${BUILD_NUMBER}
                        docker tag devops_mini_project-frontend ${FRONTEND_IMAGE}:${BUILD_NUMBER}

                        # Push
                        docker push ${BACKEND_IMAGE}:latest
                        docker push ${FRONTEND_IMAGE}:latest
                        docker push ${BACKEND_IMAGE}:${BUILD_NUMBER}
                        docker push ${FRONTEND_IMAGE}:${BUILD_NUMBER}

                        docker logout
                    '''
                }
            }
        }

        stage('Deploy to EC2') {
            steps {
                echo '─────────────────── Deploying to EC2 via SSH ───────────────────'
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'ec2-ssh-key',
                        keyFileVariable: 'SSH_KEY'
                    ),
                    string(
                        credentialsId: 'ec2-host',
                        variable: 'EC2_HOST'
                    )
                ]) {
                    sh '''
                        ssh -i $SSH_KEY \
                            -o StrictHostKeyChecking=no \
                            ubuntu@${EC2_HOST} "
                            cd ~/app

                            # Pull latest images from Docker Hub
                            docker compose pull

                            # Restart containers with zero-downtime rolling update
                            docker compose up -d --remove-orphans

                            # Clean up old images (keep disk usage in check)
                            docker image prune -f

                            echo 'Deployment complete'
                        "
                    '''
                }
            }
        }

        stage('Health Check') {
            steps {
                echo '─────────────────── Verifying deployment health ───────────────────'
                withCredentials([string(credentialsId: 'ec2-host', variable: 'EC2_HOST')]) {
                    sh '''
                        sleep 20
                        curl -sf http://${EC2_HOST}:8000/health || \
                            (echo "Backend health check FAILED" && exit 1)
                        echo "Backend healthy at http://${EC2_HOST}:8000"
                        echo "Frontend at http://${EC2_HOST}:3000"
                        echo "Grafana  at http://${EC2_HOST}:3001"
                    '''
                }
            }
        }
    }

    post {
        success {
            withCredentials([string(credentialsId: 'ec2-host', variable: 'EC2_HOST')]) {
                echo "Pipeline succeeded. App live at http://${EC2_HOST}:3000"
            }
        }
        failure {
            echo 'Pipeline failed. Check logs above.'
            sh 'docker compose logs --tail=50 || true'
        }
        always {
            echo 'Pipeline finished.'
        }
    }
}
