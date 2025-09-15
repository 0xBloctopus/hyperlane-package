FROM node:20-bullseye

# Install foundry (cast, forge, anvil) and yq
RUN apt-get update && apt-get install -y curl git wget && \
    curl -L https://foundry.paradigm.xyz | bash && \
    export PATH="/root/.foundry/bin:$PATH" && \
    /root/.foundry/bin/foundryup && \
    ln -s /root/.foundry/bin/cast /usr/local/bin/cast && \
    ln -s /root/.foundry/bin/forge /usr/local/bin/forge && \
    ln -s /root/.foundry/bin/anvil /usr/local/bin/anvil && \
    # Install yq for YAML processing
    YQ_VERSION=v4.40.5 && \
    wget -qO /usr/local/bin/yq "https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_linux_amd64" && \
    chmod +x /usr/local/bin/yq && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Hyperlane CLI (updated to latest stable version)
ARG CLI_VERSION=18.2.0
RUN npm i -g @hyperlane-xyz/cli@${CLI_VERSION}

# Set working directory first
WORKDIR /work

# Setup Node modules in the work directory for proper module resolution
RUN npm init -y && npm i ethers yaml

# Copy deployment scripts (these need to be copied into build context)
COPY deployment-scripts/deploy_core.sh /usr/local/bin/deploy_core.sh
COPY deployment-scripts/warp_routes.sh /usr/local/bin/warp_routes.sh
COPY deployment-scripts/seed_liquidity.sh /usr/local/bin/seed_liquidity.sh

# Copy utility scripts
COPY utilities/send_warp.sh /usr/local/bin/send_warp.sh
COPY utilities/balances.js /usr/local/bin/balances.js
COPY utilities/parse_txhash.js /usr/local/bin/parse_txhash.js

# Copy common utilities
COPY common.sh /usr/local/bin/common.sh
COPY utilities/template_processor.sh /usr/local/bin/template_processor.sh

# Copy agent config generator
COPY config-tools/agent-config-generator.js /work/agent-config-generator.js

# Make scripts executable
RUN chmod +x /usr/local/bin/*.sh

# Default command
CMD ["sleep", "infinity"]