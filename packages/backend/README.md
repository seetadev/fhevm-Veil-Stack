# Canteen Orchestrator - Python Backend

This is the Python backend for the Canteen decentralized container orchestrator. It handles:

- **P2P Networking**: libp2p-based peer discovery and communication
- **Smart Contract Integration**: Listens to blockchain events and manages deployments
- **Docker Management**: Deploys and manages containers across operator nodes
- **FHE Integration**: Handles encrypted memory allocation using Fully Homomorphic Encryption

## Prerequisites

- Python 3.12+
- Docker Desktop running
- Hardhat node running (from parent project)
- Contract deployed on Hardhat

## Setup

### 1. Create Virtual Environment

```bash
# From fhevm-react-template root
cd packages/backend

# Create virtual environment
python3 -m venv venv

# Activate it
source venv/bin/activate  # macOS/Linux
# or
venv\Scripts\activate  # Windows
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

Edit `../../.env` in the project root:

```bash
# Blockchain Configuration
BLOCKCHAIN_PROVIDER=http://localhost:8545
CONTRACT_ADDRESS=0x4A679253410272dd5232B3Ff7cF5dbB88f295319

# FHE Configuration
MEMORY_MB=2000

# P2P Configuration
P2P_PORT=5000
```

## Running Operator Nodes

Each operator node runs independently and registers itself with the smart contract.

### Start a Single Operator

```bash
# From packages/backend directory with venv activated
python main.py --memory 1000 --port 5000
```

### Start Multiple Operators (Different Terminals)

**Terminal 1:**
```bash
cd packages/backend
source venv/bin/activate
python main.py --memory 1000 --port 5000
```

**Terminal 2:**
```bash
cd packages/backend
source venv/bin/activate
python main.py --memory 1500 --port 5001
```

**Terminal 3:**
```bash
cd packages/backend
source venv/bin/activate
python main.py --memory 2000 --port 5002
```

### Command Line Arguments

- `--memory`: Memory capacity in MB (default: from .env or 4096)
- `--port`: P2P port (default: from .env or 5000)
- `--web-port`: Web API port (default: from .env or 3000)

## Verify Registration

From the project root:

```bash
python check_members.py
```

This will show:
- Total registered operator nodes
- Each node's Peer ID
- Assigned containers
- Encrypted memory allocation
- Image deployment status

## Architecture

```
packages/backend/
├── main.py           # Entry point - starts all services
├── config.py         # Configuration from .env
├── cluster.py        # P2P networking (libp2p + mDNS)
├── scheduler.py      # Blockchain event listener & container deployment
├── protocol.py       # P2P communication protocol
├── fhe_helper.py     # FHE encryption/decryption helpers
├── client.py         # HTTP API client for inter-node communication
├── web_server.py     # Web API for node management
└── requirements.txt  # Python dependencies
```

## How It Works

1. **Startup**: Node starts P2P networking and connects to blockchain
2. **Registration**: Node registers itself with smart contract (encrypted memory)
3. **Discovery**: Uses mDNS to discover other nodes in the cluster
4. **Listening**: Watches blockchain for `ImageDeployment` events
5. **Deployment**: When assigned a container, pulls image and starts it
6. **Monitoring**: Tracks container health and reports status

## API Endpoints

Each operator exposes a web API (default port 3000 + offset):

- `GET /status` - Node status and peer ID
- `GET /peers` - Connected peers
- `GET /containers` - Running containers
- `POST /deploy` - Manual container deployment

## Troubleshooting

### Issue: "Cannot connect to blockchain"
**Solution**: Make sure Hardhat node is running:
```bash
cd ../..  # Go to project root
pnpm hardhat:chain
```

### Issue: "CONTRACT_ADDRESS not set"
**Solution**: Update `.env` file with deployed contract address

### Issue: "Docker connection error"
**Solution**: Make sure Docker Desktop is running

### Issue: "No members registered"
**Solution**: 
1. Check operator logs for errors
2. Verify Hardhat node is running
3. Ensure contract address is correct

## Development

### Run with Debug Logging

```bash
python main.py --memory 1000 --port 5000 --debug
```

### Test P2P Connection

```bash
# In one terminal
python main.py --memory 1000 --port 5000

# In another terminal
python main.py --memory 1500 --port 5001

# Check logs - should show peer discovery
```

## Integration with Frontend

The frontend (Next.js app) connects to the same smart contract and:
- Shows registered operator nodes
- Allows deploying container images
- Displays deployment status
- Shows replica counts

Both frontend and backend stay in sync through blockchain events.
