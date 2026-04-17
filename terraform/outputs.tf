output "ec2_public_ip" {
  description = "SSH / app access IP"
  value       = aws_instance.money_mentor.public_ip
}

output "ec2_public_dns" {
  value = aws_instance.money_mentor.public_dns
}

output "backend_url" {
  value = "http://${aws_instance.money_mentor.public_ip}:8000"
}

output "frontend_url" {
  value = "http://${aws_instance.money_mentor.public_ip}:3000"
}

output "jenkins_url" {
  value = "http://${aws_instance.money_mentor.public_ip}:8080"
}

output "sonarqube_url" {
  value = "http://${aws_instance.money_mentor.public_ip}:9000"
}

output "grafana_url" {
  value = "http://${aws_instance.money_mentor.public_ip}:3001"
}

output "ec2_instance_id" {
  value = aws_instance.money_mentor.id
}
