#!/bin/bash

# Build script for Hyperlane package Docker images
# Uses specific versions instead of latest

set -e

echo "Building Hyperlane Docker images with specific versions..."

# Version configurations
CLI_VERSION="16.2.0"
CONFIG_GEN_VERSION="1.0.0"
IMAGE_TAG="v1.0.25"
USER_NAME="fravlaca"

# Build hyperlane-cli image
echo "Building hyperlane-cli:${IMAGE_TAG}..."
docker build \
  -t ${USER_NAME}/hyperlane-cli:${IMAGE_TAG} \
  -t ${USER_NAME}/hyperlane-cli:latest \
  --build-arg CLI_VERSION=${CLI_VERSION} \
  -f src/deployments/hyperlane-deployer/Dockerfile \
  src/deployments/hyperlane-deployer/

# Agent config generation is now integrated into hyperlane-cli image
# No separate agent-config-gen image needed

echo "Docker image built successfully!"
echo ""
echo "Image created:"
echo "  - ${USER_NAME}/hyperlane-cli:${IMAGE_TAG} (also tagged as latest)"
echo "    Includes agent config generation capabilities"
echo ""
echo "To use specific versions in deployment, update your config to use:"
echo "  cli_version: ${IMAGE_TAG}"
echo "  Or keep using 'latest' which points to ${IMAGE_TAG}"