pipeline {
    agent any

    environment {
        AZURE_SUBSCRIPTION_ID = '59260725-a3d3-4d63-aaf7-4c2c97fce963'
        RESOURCE_GROUP = 'gnss-demo-rg'
        AKS_NAME = 'airace-cluster'
    }

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
                    sh '''
                        echo "$DOCKER_PASSWORD" | docker login \
                          -u "$DOCKER_USERNAME" \
                          --password-stdin

                        docker push subhramukti/subhramukti-airacedemo-azure:latest

                        docker logout
                    '''
                }
            }
        }


        // =====================================================
        // IMPORTANT: MAIN DEPLOYMENT PART — PLEASE FOCUS HERE
        // =====================================================

        stage('Azure Login and Deploy to AKS') {
            steps {
                withCredentials([
                    string(
                        credentialsId: 'AZURE_CLIENT_ID',
                        variable: 'AZURE_CLIENT_ID'
                    ),
                    string(
                        credentialsId: 'AZURE_CLIENT_SECRET',
                        variable: 'AZURE_CLIENT_SECRET'
                    ),
                    string(
                        credentialsId: 'AZURE_TENANT_ID',
                        variable: 'AZURE_TENANT_ID'
                    )
                ]) {

                    sh '''
                        # Login to Azure
                        az login --service-principal \
                          --username "$AZURE_CLIENT_ID" \
                          --password "$AZURE_CLIENT_SECRET" \
                          --tenant "$AZURE_TENANT_ID"

                        # Select Azure subscription
                        az account set \
                          --subscription "$AZURE_SUBSCRIPTION_ID"

                        # Connect kubectl to AKS
                        az aks get-credentials \
                          --resource-group "$RESOURCE_GROUP" \
                          --name "$AKS_NAME" \
                          --overwrite-existing

                        # Deploy application to AKS
                        kubectl apply -f k8s/deployment.yaml

                        # Create/update Kubernetes Service
                        kubectl apply -f k8s/service.yaml
                    '''
                }
            }
        }


        stage('Verify AKS Deployment') {
            steps {
                sh '''
                    kubectl get pods
                    kubectl get services
                '''
            }
        }
    }

    post {

        success {
            echo 'Pipeline completed successfully. Application deployed to AKS.'
        }

        failure {
            echo 'Pipeline failed. Please check the Jenkins console output.'
        }

        always {
            echo 'Pipeline execution completed.'
        }
    }
}