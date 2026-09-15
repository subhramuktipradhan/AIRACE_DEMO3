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

        stage('Push Docker Image') {
            steps {
                echo 'Docker Hub push will be configured after Docker Hub repository and Jenkins credentials are created.'
            }
        }
    }
}