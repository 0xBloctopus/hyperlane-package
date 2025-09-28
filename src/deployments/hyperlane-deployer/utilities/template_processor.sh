#!/bin/bash
# Template processor script for Hyperlane deployment
# This script provides functions for processing template files

# Function to generate ISM configuration from template
generate_ism_from_template() {
    local ism_type="$1"
    local deployer_address="$2"
    local template_dir="$3"

    # Normalise the requested ISM type so we accept variants like
    # "messageIdMultisigIsm" or mixed-case inputs coming from the CLI args file.
    local normalized_type
    normalized_type=$(echo "${ism_type:-}" | tr '[:upper:]' '[:lower:]')

    # Handle different ISM types
    case "$normalized_type" in
        "multisig"|"messageidmultisig"|"messageidmultisigism")
            # Get validators and threshold from environment
            local validators="${ISM_VALIDATORS:-$deployer_address}"
            local requested_threshold="${ISM_THRESHOLD:-1}"

            # Count the number of validators
            local validator_count=$(echo "$validators" | awk -F',' '{print NF}')

            # Ensure threshold doesn't exceed validator count
            local threshold=$requested_threshold
            if [ $threshold -gt $validator_count ]; then
                echo "[WARN] Threshold ($requested_threshold) exceeds validator count ($validator_count), adjusting to $validator_count" >&2
                threshold=$validator_count
            fi

            # Convert comma-separated validators to JSON array
            local validators_json=$(echo "$validators" | awk -F',' '{
                printf "["
                for(i=1; i<=NF; i++) {
                    gsub(/^[ \t]+|[ \t]+$/, "", $i)
                    printf "\"%s\"", $i
                    if(i<NF) printf ", "
                }
                printf "]"
            }')

            cat <<EOF
{
  "type": "messageIdMultisigIsm",
  "validators": $validators_json,
  "threshold": $threshold
}
EOF
            ;;
            
        "merklerootmultisig"|"merklerootmultisigism")
            # Get validators and threshold from environment
            local validators="${ISM_VALIDATORS:-$deployer_address}"
            local requested_threshold="${ISM_THRESHOLD:-1}"

            # Count the number of validators
            local validator_count=$(echo "$validators" | awk -F',' '{print NF}')

            # Ensure threshold doesn't exceed validator count
            local threshold=$requested_threshold
            if [ $threshold -gt $validator_count ]; then
                echo "[WARN] Threshold ($requested_threshold) exceeds validator count ($validator_count), adjusting to $validator_count" >&2
                threshold=$validator_count
            fi

            # Convert comma-separated validators to JSON array
            local validators_json=$(echo "$validators" | awk -F',' '{
                printf "["
                for(i=1; i<=NF; i++) {
                    gsub(/^[ \t]+|[ \t]+$/, "", $i)
                    printf "\"%s\"", $i
                    if(i<NF) printf ", "
                }
                printf "]"
            }')

            cat <<EOF
{
  "type": "merkleRootMultisigIsm",
  "validators": $validators_json,
  "threshold": $threshold
}
EOF
            ;;
            
        "trustedrelayer"|"trustedrelayerism")
            local relayer="${ISM_RELAYER:-$deployer_address}"
            cat <<EOF
{
  "type": "trustedRelayerIsm",
  "relayer": "$relayer"
}
EOF
            ;;
            
        "pausable"|"pausableism")
            local owner="${ISM_OWNER:-$deployer_address}"
            local pauser="${ISM_PAUSER:-$owner}"
            cat <<EOF
{
  "type": "pausableIsm",
  "owner": "$owner",
  "pauser": "$pauser"
}
EOF
            ;;
            
        *)
            # Default to trusted relayer
            cat <<EOF
{
  "type": "trustedRelayerIsm",
  "relayer": "$deployer_address"
}
EOF
            ;;
    esac
}

# Function to generate core config from template
generate_core_config_from_template() {
    local deployer_address="$1"
    local ism_config="$2"
    local template_file="$3"
    local output_file="$4"
    
    # If template doesn't exist, create a basic core config
    if [ ! -f "$template_file" ]; then
        echo "Template file not found: $template_file, creating basic config"
        cat > "$output_file" <<EOF
{
  "owner": "$deployer_address",
  "defaultIsm": $ism_config,
  "defaultHook": {
    "type": "merkleTreeHook"
  },
  "requiredHook": {
    "type": "pausableHook",
    "paused": false,
    "owner": "$deployer_address"
  }
}
EOF
    else
        # Process the template using Python to safely substitute placeholders
        python3 - "$template_file" "$output_file" "$deployer_address" "$ism_config" <<'PYTHON'
import sys
from pathlib import Path

template_path, output_path, deployer_address, ism_config = sys.argv[1:]

template = Path(template_path).read_text()
rendered = template.replace("{{DEPLOYER_ADDRESS}}", deployer_address)
rendered = rendered.replace("{{ISM_CONFIG}}", ism_config)

Path(output_path).write_text(rendered)
PYTHON
    fi
    
    echo "Generated core config at: $output_file"
}
