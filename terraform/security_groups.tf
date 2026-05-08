# ---- ALB Security Group ----
resource "aws_security_group" "alb" {
  name        = "${var.app_name}-alb-sg"
  description = "Allow HTTP/HTTPS inbound to ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP from anywhere"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS from anywhere"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound"
  }

  tags = { Name = "${var.app_name}-alb-sg" }
}

# ---- ECS Security Group ----
resource "aws_security_group" "ecs" {
  name        = "${var.app_name}-ecs-sg"
  description = "Allow traffic from ALB to ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
    description     = "API port from ALB"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound (ECR pull, Secrets Manager, DocumentDB)"
  }

  tags = { Name = "${var.app_name}-ecs-sg" }
}

# ---- DocumentDB Security Group ----
resource "aws_security_group" "documentdb" {
  name        = "${var.app_name}-documentdb-sg"
  description = "Allow DocumentDB only from ECS tasks"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
    description     = "DocumentDB from ECS"
  }

  tags = { Name = "${var.app_name}-documentdb-sg" }
}
