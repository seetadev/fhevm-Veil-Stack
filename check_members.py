#!/usr/bin/env python3
"""
Check registered members in the Canteen contract and their assigned containers.
Reads configuration from .env file.
"""

import json
import os
from pathlib import Path
from web3 import Web3
from dotenv import load_dotenv

# Load environment variables from project root
project_root = Path(__file__).parent
env_path = project_root / '.env'
load_dotenv(env_path)

# Get configuration from environment
BLOCKCHAIN_PROVIDER = os.getenv('BLOCKCHAIN_PROVIDER', 'http://localhost:8545')
CONTRACT_ADDRESS = os.getenv('CONTRACT_ADDRESS')

if not CONTRACT_ADDRESS:
    print("❌ Error: CONTRACT_ADDRESS not set in .env file")
    exit(1)

# Connect to blockchain
w3 = Web3(Web3.HTTPProvider(BLOCKCHAIN_PROVIDER))

if not w3.is_connected():
    print(f"❌ Error: Cannot connect to blockchain at {BLOCKCHAIN_PROVIDER}")
    exit(1)

# Load contract ABI from Hardhat artifacts
contract_abi = None
contract_name = None

# Try Canteen.sol first
contract_paths = [
    ('Canteen', project_root / 'packages/hardhat/artifacts/contracts/Canteen.sol/Canteen.json'),
    ('CanteenFHEVM', project_root / 'packages/hardhat/artifacts/contracts/CanteenFHEVM.sol/CanteenFHEVM.json'),
]

for name, path in contract_paths:
    try:
        with open(path) as f:
            contract_json = json.load(f)
            contract_abi = contract_json['abi']
            contract_name = name
            print(f"✓ Using {name} contract from {path.relative_to(project_root)}")
            break
    except FileNotFoundError:
        continue

if not contract_abi:
    print("❌ Error: Could not find contract ABI files")
    print("   Make sure contracts are compiled: pnpm hardhat:compile")
    exit(1)

# Create contract instance
contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=contract_abi)

# Get network info
try:
    chain_id = w3.eth.chain_id
except Exception as e:
    chain_id = "Unknown"

print("=" * 80)
print("CANTEEN CONTRACT MEMBER STATUS")
print("=" * 80)
print(f"Contract: {contract_name}")
print(f"Contract Address: {CONTRACT_ADDRESS}")
print(f"Network: {BLOCKCHAIN_PROVIDER}")
print(f"Chain ID: {chain_id}")
print()

# Get total number of members
try:
    member_count = contract.functions.getMembersCount().call()
    print(f"Total Registered Members: {member_count}")
    print()
    
    if member_count == 0:
        print("No members registered yet.")
        print()
        print("To register operators, run:")
        print("  python packages/backend/main.py --memory 1000 --port 5000")
    else:
        print("-" * 80)
        print("REGISTERED MEMBERS:")
        print("-" * 80)
        print()
        
        # Get details for each member
        for i in range(member_count):
            host = contract.functions.members(i).call()
            
            # Get member details
            try:
                encrypted_memory = contract.functions.getMemberEncryptedMemory(host).call()
                container_count = contract.functions.memberContainerCount(Web3.keccak(text=host)).call()
                
                print(f"{i+1}. Host/Peer ID: {host}")
                
                # Show assigned containers
                if container_count > 0:
                    print(f"   Assigned Images ({container_count}):")
                    for j in range(container_count):
                        container = contract.functions.memberContainers(Web3.keccak(text=host), j).call()
                        print(f"     - {container}")
                else:
                    print(f"   Assigned Images: None")
                
                print(f"   Status: Active")
                print(f"   Encrypted Memory: {encrypted_memory.hex()[:10]}... ({len(encrypted_memory)} bytes)")
                print()
                
            except Exception as e:
                print(f"   Error getting member details: {e}")
                print()
        
        # Get image deployments
        print("-" * 80)
        print("IMAGE DEPLOYMENTS:")
        print("-" * 80)
        print()
        
        try:
            image_count = contract.functions.getImagesCount().call()
            
            if image_count == 0:
                print("No images deployed yet.")
                print()
                print("Deploy an image via the dashboard at http://localhost:3000")
            else:
                for i in range(image_count):
                    image_name = contract.functions.images(i).call()
                    
                    # Get image details
                    try:
                        details = contract.functions.getImageDetails(image_name).call()
                        replicas = details[0]
                        deployed = details[1]
                        active = details[2]
                        
                        print(f"{i+1}. {image_name}")
                        print(f"   Requested Replicas: {replicas}")
                        print(f"   Deployed: {deployed}")
                        print(f"   Status: {'Active' if active else 'Inactive'}")
                        print()
                    except Exception as e:
                        print(f"   Error getting image details: {e}")
                        print()
        except Exception as e:
            print(f"Error getting image deployments: {e}")
            print()

except Exception as e:
    print(f"Error querying contract: {e}")
    print()
    print("Make sure:")
    print("1. Blockchain is running (pnpm hardhat:chain)")
    print("2. Contract is deployed (pnpm deploy:localhost)")
    print("3. CONTRACT_ADDRESS in .env is correct")

print("=" * 80)
