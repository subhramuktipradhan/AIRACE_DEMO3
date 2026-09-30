pipeline {
    agent any

    environment {
        AZURE_SUBSCRIPTION_ID = '59260725-a3d3-4d63-aaf7-4c2c97fce963'
        RESOURCE_GROUP = 'gnss-demo-rg'
        AKS_NAME = 'airace-cluster'

        BACKEND_IMAGE = 'subhramukti/subhramukti-airacedemo-azure:dev'
        FRONTEND_IMAGE = 'subhramukti/airace-frontend:dev'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Backend Dependencies') {
            steps {
                sh 'npm install'
            }
        }

        stage('Test Backend') {
            steps {
                sh 'npm test --if-present'
            }
        }

        stage('Build Backend Application') {
            steps {
                sh 'npm run build --if-present'
            }
        }

        stage('Build Backend Docker Image') {
            steps {
                sh '''
                    docker build \
                      -t "$BACKEND_IMAGE" \
                      .
                '''
            }
        }

        stage('Push Backend Docker Image') {
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

                        docker push "$BACKEND_IMAGE"

                        docker logout
                    '''
                }
            }
        }

        stage('Build Frontend Docker Image') {
            steps {
                sh '''
                    docker build \
                      -t "$FRONTEND_IMAGE" \
                      ./frontend
                '''
            }
        }

        stage('Push Frontend Docker Image') {
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

                        docker push "$FRONTEND_IMAGE"

                        docker logout
                    '''
                }
            }
        }


        // =====================================================
        // DEPLOY DEVELOPER / STAGING TO AKS
        // =====================================================

        stage('Azure Login and Deploy Developer to AKS') {
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


                        # Select subscription
                        az account set \
                          --subscription "$AZURE_SUBSCRIPTION_ID"


                        # Connect kubectl to AKS
                        az aks get-credentials \
                          --resource-group "$RESOURCE_GROUP" \
                          --name "$AKS_NAME" \
                          --overwrite-existing


                        # Existing ServiceAccount
                        kubectl apply \
                          -f k8s/serviceaccount.yaml


                        # -------------------------
                        # BACKEND
                        # -------------------------

                        kubectl apply \
                          -f k8s/staging/headless-service.yaml

                        kubectl apply \
                          -f k8s/staging/deployment.yaml

                        kubectl rollout restart \
                          deployment/airace-dev

                        kubectl rollout status \
                          deployment/airace-dev \
                          --timeout=180s

                        kubectl apply \
                          -f k8s/staging/service.yaml

                        kubectl apply \
                          -f k8s/staging/hpa.yaml


                        # -------------------------
                        # FRONTEND
                        # -------------------------

                        kubectl apply \
                          -f k8s/staging/frontend-deployment.yaml

                        kubectl rollout restart \
                          deployment/airace-frontend-dev

                        kubectl rollout status \
                          deployment/airace-frontend-dev \
                          --timeout=180s

                        kubectl apply \
                          -f k8s/staging/frontend-service.yaml
                    '''
                }
            }
        }


        // =====================================================
        // VERIFY DEVELOPER DEPLOYMENT
        // =====================================================

        stage('Verify Developer Deployment') {
            steps {

                sh '''

                    echo "===== PODS ====="
                    kubectl get pods

                    echo "===== SERVICES ====="
                    kubectl get services

                    echo "===== HPA ====="
                    kubectl get hpa

                    echo "===== BACKEND ENDPOINTS ====="
                    kubectl get endpoints \
                      airace-dev-service

                    echo "===== FRONTEND ENDPOINTS ====="
                    kubectl get endpoints \
                      airace-frontend-dev-service

                    echo "===== BACKEND LOGS ====="
                    kubectl logs \
                      deployment/airace-dev \
                      --tail=50

                    echo "===== FRONTEND LOGS ====="
                    kubectl logs \
                      deployment/airace-frontend-dev \
                      --tail=50
                '''
            }
        }
    }


    // =====================================================
    // EMAIL NOTIFICATION
    // =====================================================

    post {

        success {

            echo 'Developer frontend and backend pipeline completed successfully.'

        }

        failure {

            echo 'Developer pipeline failed. Sending email notification.'

            emailext(

                to: 'subhramuktipradhan@gmail.com',

                subject: "Jenkins Developer Pipeline FAILED: ${env.JOB_NAME} #${env.BUILD_NUMBER}",

                body: """
AIRACE Developer Jenkins Pipeline Failed.

Job Name: ${env.JOB_NAME}

Build Number: ${env.BUILD_NUMBER}

Build Status: ${currentBuild.currentResult}

Build URL: ${env.BUILD_URL}

Please check the Jenkins console output.
"""
            )
        }

        always {
            echo 'Developer pipeline execution completed.'
        }
    }
}