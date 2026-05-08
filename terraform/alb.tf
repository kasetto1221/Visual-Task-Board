locals {
  has_certificate = var.certificate_arn != ""
}

resource "aws_lb" "main" {
  name               = "${var.app_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  tags = { Name = "${var.app_name}-alb" }
}

resource "aws_lb_target_group" "api" {
  name        = "${var.app_name}-api-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    path                = "/api/healthz"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
    matcher             = "200"
  }

  tags = { Name = "${var.app_name}-api-tg" }
}

# HTTP listener — redirects to HTTPS if certificate is provided
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = local.has_certificate ? "redirect" : "forward"

    dynamic "redirect" {
      for_each = local.has_certificate ? [1] : []
      content {
        protocol    = "HTTPS"
        port        = "443"
        status_code = "HTTP_301"
      }
    }

    dynamic "forward" {
      for_each = local.has_certificate ? [] : [1]
      content {
        target_group {
          arn = aws_lb_target_group.api.arn
        }
      }
    }
  }
}

# HTTPS listener (only when ACM certificate ARN is provided)
resource "aws_lb_listener" "https" {
  count             = local.has_certificate ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = var.certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}
