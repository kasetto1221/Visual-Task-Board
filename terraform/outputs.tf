output "cloudfront_url" {
  description = "CloudFront distribution URL — open this in your browser"
  value       = "https://${aws_cloudfront_distribution.main.domain_name}"
}

output "alb_dns_name" {
  description = "ALB DNS name (direct API access)"
  value       = aws_lb.main.dns_name
}

output "api_health_check_url" {
  description = "API health check endpoint"
  value       = "http://${aws_lb.main.dns_name}/api/healthz"
}

output "ecr_repository_uri" {
  description = "ECR repository URI — tag and push your Docker image here"
  value       = aws_ecr_repository.api.repository_url
}

output "frontend_bucket_name" {
  description = "S3 bucket name — run 'aws s3 sync dist/ s3://<bucket>' after build"
  value       = aws_s3_bucket.frontend.bucket
}

output "documentdb_endpoint" {
  description = "DocumentDB cluster endpoint (accessible from ECS tasks only)"
  value       = aws_docdb_cluster.main.endpoint
}

output "documentdb_secret_arn" {
  description = "Secrets Manager ARN containing MONGODB_URI"
  value       = aws_secretsmanager_secret.documentdb.arn
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "deploy_commands" {
  description = "Quick reference deployment commands"
  value = <<-EOT
    # 1. Build and push Docker image
    aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${aws_ecr_repository.api.repository_url}
    docker build -t ${aws_ecr_repository.api.repository_url}:latest .
    docker push ${aws_ecr_repository.api.repository_url}:latest

    # 2. Build and upload frontend
    pnpm --filter @workspace/task-board run build
    aws s3 sync artifacts/task-board/dist/ s3://${aws_s3_bucket.frontend.bucket} --delete

    # 3. Invalidate CloudFront cache
    aws cloudfront create-invalidation --distribution-id ${aws_cloudfront_distribution.main.id} --paths "/*"
  EOT
}
