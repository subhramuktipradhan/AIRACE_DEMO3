
pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Test') {
            steps {
                sh 'npm test --if-present'
            }
        }

        stage('Build Application') {
            steps {
                sh 'npm run build --if-present'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh 'docker build -t subhramukti/subhramukti-airacedemo-azure:latest .'
            }
        }

        stage('Push Docker Image') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-credentials',
                        usernameVariable: 'DOCKER_USERNAME',
                        passwordVariable: 'DOCKER_PASSWORD'
                    )
                ]) {

                    sh 'echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin'

                    sh 'docker push subhramukti/subhramukti-airacedemo-azure:latest'

                    sh 'docker logout'
                }
            }
        }
    }

    post {
        success {
            echo 'Pipeline completed successfully. Docker image pushed to Docker Hub.'
        }

        failure {
            echo 'Pipeline failed. Please check the Jenkins console output.'
        }

        always {
            echo 'Pipeline execution completed.'
        }
    }
}

