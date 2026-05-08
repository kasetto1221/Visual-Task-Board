variable "app_name" {
  description = "Application name used as a prefix for all resources"
  type        = string
  default     = "visual-task-board"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
  validation {
    condition     = contains(["production", "staging"], var.environment)
    error_message = "environment must be 'production' or 'staging'."
  }
}

variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ap-northeast-1"
}

# ---- Networking ----
variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for the two public subnets (ALB)"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for the two private subnets (ECS / RDS)"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24"]
}

# ---- ECS / API ----
variable "api_image" {
  description = "Docker image URI for the API server (ECR or Docker Hub)"
  type        = string
}

variable "api_desired_count" {
  description = "Number of ECS Fargate tasks to run"
  type        = number
  default     = 2
}

variable "api_cpu" {
  description = "CPU units for each ECS task (1 vCPU = 1024)"
  type        = number
  default     = 512
}

variable "api_memory" {
  description = "Memory (MiB) for each ECS task"
  type        = number
  default     = 1024
}

variable "api_min_capacity" {
  description = "Minimum number of ECS tasks for auto-scaling"
  type        = number
  default     = 2
}

variable "api_max_capacity" {
  description = "Maximum number of ECS tasks for auto-scaling"
  type        = number
  default     = 10
}

variable "api_cpu_scale_target" {
  description = "Target CPU utilisation (%) for auto-scaling"
  type        = number
  default     = 70
}

# ---- RDS ----
variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_name" {
  description = "PostgreSQL database name"
  type        = string
  default     = "taskboard"
}

variable "db_username" {
  description = "RDS master username"
  type        = string
  default     = "taskboard_admin"
  sensitive   = true
}

variable "db_password" {
  description = "RDS master password (min 16 chars). Use TF_VAR_db_password env var."
  type        = string
  sensitive   = true
  validation {
    condition     = length(var.db_password) >= 16
    error_message = "db_password must be at least 16 characters."
  }
}

variable "db_multi_az" {
  description = "Enable Multi-AZ for RDS (recommended for production)"
  type        = bool
  default     = false
}

variable "db_backup_retention_days" {
  description = "Number of days to retain automated RDS backups"
  type        = number
  default     = 7
}

# ---- HTTPS ----
variable "certificate_arn" {
  description = "ACM certificate ARN for HTTPS on the ALB. Leave empty to use HTTP only."
  type        = string
  default     = ""
}
