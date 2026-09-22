
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
        // DEPLOYMENT TO AKS
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

                        # Create/update Kubernetes ServiceAccount
                        kubectl apply -f k8s/serviceaccount.yaml

                        # Deploy application to AKS
                        kubectl apply -f k8s/deployment.yaml

                        # Restart Pods to pull the latest image
                        kubectl rollout restart deployment/airace-demo

                        # Wait for deployment to complete
                        kubectl rollout status deployment/airace-demo --timeout=180s

                        # Create/update Kubernetes Service
                        kubectl apply -f k8s/service.yaml

                        # Create/update Horizontal Pod Autoscaler
                        kubectl apply -f k8s/hpa.yaml
                    '''
                }
            }
        }


        // =====================================================
        // VERIFY AKS DEPLOYMENT
        // =====================================================

        stage('Verify AKS Deployment') {
            steps {
                sh '''
                    kubectl get pods
                    kubectl get services
                    kubectl get hpa
                    kubectl get endpoints airace-demo-service
                    kubectl logs deployment/airace-demo --tail=50
                '''
            }
        }
    }


    // =====================================================
    // EMAIL NOTIFICATION
    // =====================================================

    post {

        success {
            echo 'Pipeline completed successfully. Application deployed to AKS.'
        }

        failure {
            echo 'Pipeline failed. Sending email notification.'

            emailext(
                to: 'subhramuktipradhan@gmail.com',

                subject: "Jenkins Pipeline FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}",

                body: """
AIRACE_DEMO3 Jenkins Pipeline Failed.

Job Name: ${env.JOB_NAME}

Build Number: ${env.BUILD_NUMBER}

Build Status: ${currentBuild.currentResult}

Build URL: ${env.BUILD_URL}

Please check the Jenkins console output
to identify the cause of the failure.
"""
            )
        }

        always {
            echo 'Pipeline execution completed.'
        }
    }
}