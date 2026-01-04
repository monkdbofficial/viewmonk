# MonkDB Multi-Node Cluster with Docker Compose

This document contains a Docker Compose configuration to deploy a **three-node MonkDB cluster** using Docker containers. The setup enables a fully functional cluster with internal communication, data storage, and authentication support.

---

## Overview

- Three MonkDB nodes (`monkdb01`, `monkdb02`, `monkdb03`) configured to form a cluster.
- Nodes communicate internally on a Docker network for clustering and data replication.
- Each node exposes HTTP (4200) and PostgreSQL wire protocol (5432) on unique host ports.
- Basic authentication configured with trust method for local access and password for other hosts.
- Memory heap size and fielddata breaker limits are tuned for performance.


## Docker Compose File

The cluster is defined in `docker-compose.yml` with the following main settings per node:

- `node.data=true`: Each node stores data and participates in the cluster.
- `network.host=_site_,_local_`: Node listens both on the Docker network and localhost.
- `discovery.seed_hosts`: Nodes discover each other using service names.
- `cluster.initial_master_nodes`: Lists the nodes eligible for master election.
- `gateway.expected_data_nodes` and `gateway.recover_after_data_nodes`: Cluster stability settings.
- Authentication options for secure access.
- Custom environment variables for JVM heap size and breaker limits.
- Persistent volume mounts for data durability.

### Compose File

```json
version: '3.8'
services:
  monkdb01:
    image: public.ecr.aws/monkdblabs/monkdblabs/monkdb:2025.3.1
    ports:
      - "4201:4200"
      - "5431:5432"
    volumes:
      - /tmp/monkdb/01:/data
    command: ["monkdb",
      "-Ccluster.name=monkdb-docker-cluster",
      "-Cnode.name=monkdb01",
      "-Cnode.data=true",
      "-Cnetwork.host=_site_,_local_",
      "-Cdiscovery.seed_hosts=monkdb02,monkdb03",
      "-Ccluster.initial_master_nodes=monkdb01,monkdb02,monkdb03",
      "-Cgateway.expected_data_nodes=3",
      "-Cgateway.recover_after_data_nodes=2",
      "-Cauth.host_based.config.0.user=monkdb",
      "-Cauth.host_based.config.0.address=_local_",
      "-Cauth.host_based.config.0.method=trust",
      "-Cauth.host_based.config.99.method=password"
    ]
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
    environment:
      - MONKDB_HEAP_SIZE=4g
      - MONKDB_INDICES_FIELDDATA_BREAKER_LIMIT=60%
  monkdb02:
    image: public.ecr.aws/monkdblabs/monkdblabs/monkdb:2025.3.1
    ports:
      - "4202:4200"
      - "5432:5432"
    volumes:
      - /tmp/monkdb/02:/data
    command: ["monkdb",
      "-Ccluster.name=monkdb-docker-cluster",
      "-Cnode.name=monkdb02",
      "-Cnode.data=true",
      "-Cnetwork.host=_site_,_local_",
      "-Cdiscovery.seed_hosts=monkdb01,monkdb03",
      "-Ccluster.initial_master_nodes=monkdb01,monkdb02,monkdb03",
      "-Cgateway.expected_data_nodes=3",
      "-Cgateway.recover_after_data_nodes=2",
      "-Cauth.host_based.config.0.user=monkdb",
      "-Cauth.host_based.config.0.address=_local_",
      "-Cauth.host_based.config.0.method=trust",
      "-Cauth.host_based.config.99.method=password"
    ]
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
    environment:
      - MONKDB_HEAP_SIZE=4g
      - MONKDB_INDICES_FIELDDATA_BREAKER_LIMIT=60%
  monkdb03:
    image: public.ecr.aws/monkdblabs/monkdblabs/monkdb:2025.3.1
    ports:
      - "4203:4200"
      - "5433:5432"
    volumes:
      - /tmp/monkdb/03:/data
    command: ["monkdb",
      "-Ccluster.name=monkdb-docker-cluster",
      "-Cnode.name=monkdb03",
      "-Cnode.data=true",
      "-Cnetwork.host=_site_,_local_",
      "-Cdiscovery.seed_hosts=monkdb01,monkdb02",
      "-Ccluster.initial_master_nodes=monkdb01,monkdb02,monkdb03",
      "-Cgateway.expected_data_nodes=3",
      "-Cgateway.recover_after_data_nodes=2",
      "-Cauth.host_based.config.0.user=monkdb",
      "-Cauth.host_based.config.0.address=_local_",
      "-Cauth.host_based.config.0.method=trust",
      "-Cauth.host_based.config.99.method=password"
    ]
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
    environment:
      - MONKDB_HEAP_SIZE=4g
      - MONKDB_INDICES_FIELDDATA_BREAKER_LIMIT=60%
so this is good to go right? i hope there won't be issues we would run into? also explain the role of these argymenbts?
      "-Cnode.data=true",
      "-Cnetwork.host=_site_,_local_",
      "-Cdiscovery.seed_hosts=monkdb01,monkdb02",
      "-Ccluster.initial_master_nodes=monkdb01,monkdb02,monkdb03",
      "-Cgateway.expected_data_nodes=3",
      "-Cgateway.recover_after_data_nodes=2",
```

---

## Usage

### Starting the cluster

```sh
$ docker-compose up -d
```

This command launches all three MonkDB nodes and forms the cluster.

### Stopping the cluster

```sh
$ docker-compose down
```

### Connecting to MonkDB

You can connect to any node using:

- HTTP API: `http://<ip_address>:4201` (or 4202, 4203 for other nodes)
- PostgreSQL protocol: use the host ports `5431`, `5432`, `5433` respectively.

Example using `psql` CLI:

```sh
$ psql -h localhost -p 5431 -U monkdb -d monkdb
```

### Using the Python Client

Example connection to a node subset for failover:

```py
from monkdb import client

connection = client.connect(
[
"http://monkdb01:4200",
"http://monkdb02:4200",
"http://monkdb03:4200"
],
username="testuser",
password="testpassword"
)
cursor = connection.cursor()
cursor.execute("SELECT name FROM sys.nodes")
print(cursor.fetchall())
```

---

## Docker Swarm

### 1. Initialize Docker Swarm (if not already done)

```sh
$ docker swarm init --advertise-addr <MANAGER-IP>
```

This command initializes the swarm mode on your current Docker host and sets the advertised IP address for other nodes to join.. Also, now join the other nodes to this master node.

### 2. Create a Docker Swarm Overlay Network

Create a network for your MonkDB services that spans all swarm nodes:

```bash
$ docker network create --driver overlay monkdb-net
```

### 3. Convert your Compose file for Swarm deployment

Your `docker-compose.yml` works for Swarm with minor adjustments (if needed) in the deploy section, which Swarm uses for service management.

Make sure your services use this overlay network by adding:

```text
networks:
  - monkdb-net
```

under each service, and define networks at the bottom:

```text
networks:
  monkdb-net:
    external: true
```

### Updated Docker Compose For Swarm

```json
version: '3.8'

networks:
  monkdb-net:
    external: true

services:
  monkdb01:
    image: public.ecr.aws/monkdblabs/monkdblabs/monkdb:2025.3.1
    ports:
      - "4201:4200"
      - "5431:5432"
    volumes:
      - /tmp/monkdb/01:/data
    networks:
      - monkdb-net
    command: ["monkdb",
      "-Ccluster.name=monkdb-docker-cluster",
      "-Cnode.name=monkdb01",
      "-Cnode.data=true",
      "-Cnetwork.host=_site_,_local_",
      "-Cdiscovery.seed_hosts=monkdb02,monkdb03",
      "-Ccluster.initial_master_nodes=monkdb01,monkdb02,monkdb03",
      "-Cgateway.expected_data_nodes=3",
      "-Cgateway.recover_after_data_nodes=2",
      "-Cauth.host_based.config.0.user=monkdb",
      "-Cauth.host_based.config.0.address=_local_",
      "-Cauth.host_based.config.0.method=trust",
      "-Cauth.host_based.config.99.method=password"
    ]
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
  monkdb02:
    image: public.ecr.aws/monkdblabs/monkdblabs/monkdb:2025.3.1
    ports:
      - "4202:4200"
      - "5432:5432"
    volumes:
      - /tmp/monkdb/02:/data
    networks:
      - monkdb-net
    command: ["monkdb",
      "-Ccluster.name=monkdb-docker-cluster",
      "-Cnode.name=monkdb02",
      "-Cnode.data=true",
      "-Cnetwork.host=_site_,_local_",
      "-Cdiscovery.seed_hosts=monkdb01,monkdb03",
      "-Ccluster.initial_master_nodes=monkdb01,monkdb02,monkdb03",
      "-Cgateway.expected_data_nodes=3",
      "-Cgateway.recover_after_data_nodes=2",
      "-Cauth.host_based.config.0.user=monkdb",
      "-Cauth.host_based.config.0.address=_local_",
      "-Cauth.host_based.config.0.method=trust",
      "-Cauth.host_based.config.99.method=password"
    ]
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
  monkdb03:
    image: public.ecr.aws/monkdblabs/monkdblabs/monkdb:2025.3.1
    ports:
      - "4203:4200"
      - "5433:5432"
    volumes:
      - /tmp/monkdb/03:/data
    networks:
      - monkdb-net
    command: ["monkdb",
      "-Ccluster.name=monkdb-docker-cluster",
      "-Cnode.name=monkdb03",
      "-Cnode.data=true",
      "-Cnetwork.host=_site_,_local_",
      "-Cdiscovery.seed_hosts=monkdb01,monkdb02",
      "-Ccluster.initial_master_nodes=monkdb01,monkdb02,monkdb03",
      "-Cgateway.expected_data_nodes=3",
      "-Cgateway.recover_after_data_nodes=2",
      "-Cauth.host_based.config.0.user=monkdb",
      "-Cauth.host_based.config.0.address=_local_",
      "-Cauth.host_based.config.0.method=trust",
      "-Cauth.host_based.config.99.method=password"
    ]
    deploy:
      replicas: 1
      restart_policy:
        condition: on-failure
```

### 4. Deploy your stack to Docker Swarm

Use the following command to deploy your cluster as a stack:

```bash
$ docker stack deploy -c docker-compose.yml monkdb-cluster
```

This command deploys your services as swarm-managed services under the stack name monkdb-cluster.

### 5. Monitor your service

Check the services in the swarm stack:

```bash
$ docker stack services monkdb-cluster
```

Inspect logs for a specific service:

```bash
$ docker service logs monkdb-cluster_monkdb01
```

Scale services if needed:

```bash
$ docker service scale monkdb-cluster_monkdb01=3
```

--- 

## Important Notes

- The cluster communication uses Docker's internal network; no need to expose the inter-node communication port (4300) externally.
- User creation and privilege management only need to be done once on any node; the cluster synchronizes them.
- Adjust heap size (`MONKDB_HEAP_SIZE`) and breaker limits according to available resources and workload.
- Make sure Docker hostnames (`monkdb01`, `monkdb02`, `monkdb03`) resolve correctly inside the Docker network.
- Please ensure docker engine and docker compose are provisioned.
- Please ensure a user is created in MonkDB as mentioned in **creating a normal user in MonkDB section** of this [document](../03_Provisioning_MonkDB_Docker_Image.md).
- Swarm handles the scheduling and distribution of your containers across nodes.
- Your MonkDB nodes will communicate internally over the swarm overlay network (monkdb-net).
- Make sure ports you expose (e.g., 4200, 5432) do not conflict and use mode: host if you want to bind directly to node IPs, or use swarm routing mesh.
- Use Swarm service update and rollback features for zero-downtime updates.

---

## Troubleshooting

- If nodes fail to form a cluster, check DNS resolution between containers.
- Verify ports are not blocked by host firewall.
- Inspect container logs using:

