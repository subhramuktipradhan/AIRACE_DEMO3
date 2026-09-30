pipeline {
    agent any

    environment {
        AZURE_SUBSCRIPTION_ID = '59260725-a3d3-4d63-aaf7-4c2c97fce963'
        RESOURCE_GROUP = 'gnss-demo-rg'
        AKS_NAME = 'airace-cluster'

        DOCKER_IMAGE = 'subhramukti/subhramukti-airacedemo-azure:dev'
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
                sh 'docker build -t $DOCKER_IMAGE .'
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

                        docker push "$DOCKER_IMAGE"

                        docker logout
                    '''
                }
            }
        }


        // =====================================================
        // DEPLOY DEVELOPER/STAGING TO AKS
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
                        kubectl apply -f k8s/serviceaccount.yaml


                        # Developer Headless Service
                        kubectl apply \
                          -f k8s/staging/headless-service.yaml


                        # Developer Deployment
                        kubectl apply \
                          -f k8s/staging/deployment.yaml


                        # Restart only developer Pods
                        kubectl rollout restart \
                          deployment/airace-dev


                        # Wait for developer deployment
                        kubectl rollout status \
                          deployment/airace-dev \
                          --timeout=180s


                        # Developer LoadBalancer Service
                        kubectl apply \
                          -f k8s/staging/service.yaml


                        # Developer HPA
                        kubectl apply \
                          -f k8s/staging/hpa.yaml
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

                    kubectl get pods

                    kubectl get services

                    kubectl get hpa

                    kubectl get endpoints \
                      airace-dev-service

                    kubectl logs \
                      deployment/airace-dev \
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

            echo 'Developer pipeline completed successfully.'

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