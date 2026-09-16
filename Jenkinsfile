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
                bat 'npm install'
            }
        }

        stage('Test') {
            steps {
                bat 'npm test --if-present'
            }
        }

        stage('Build Application') {
            steps {
                bat 'npm run build --if-present'
            }
        }

        stage('Build Docker Image') {
            steps {
                bat 'docker build -t gnss-api:latest .'
            }
        }

        stage('Check Docker Environment') {
            steps {
                bat 'docker info'
                bat 'set | findstr /I "PROXY"'
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

                    bat 'echo %DOCKER_PASSWORD%| docker login -u %DOCKER_USERNAME% --password-stdin'

                    bat 'docker tag gnss-api:latest %DOCKER_USERNAME%/airacedemo3:latest'

                    bat 'docker push %DOCKER_USERNAME%/airacedemo3:latest'

                    bat 'docker logout'
                }
            }
        }
    }
}