variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
}

variable "ami_id" {
  description = "Ubuntu 24.04 LTS AMI for ap-south-1"
  type        = string
  default     = "ami-0f58b397bc5c1f2e8"
}

variable "key_name" {
  description = "EC2 Key Pair name (must exist in your AWS account)"
  type        = string
}

variable "allowed_ssh_cidr" {
  description = "Your IP/32 for SSH lockdown — get it from https://checkip.amazonaws.com"
  type        = string
}
