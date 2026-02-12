# Running MonkDB on Docker

## Spawning MonkDB Container
Create a dedicated network using the below command to manage persistence.

```bash
$ docker network create monkdb
```

Pull our docker image hosted in AWS ECR public repository.

```bash
$ docker pull public.ecr.aws/monkdblabs/monkdblabs/monkdb:2025.3.1
```

The current stable & latest version is `2025.3.1`. However, please update this version in the above 
command whenever we release a new image.

If you are facing issues in downloading image from this repo, please do the below. 

```bash
$ wget https://workdrive.zohoexternal.in/external/74d6f912e5434503e6606bebc0812c9bb8a27ea558af5410990e55c3a38d0cdb
```

Once you download the image, please run the below command. 

```bash
$ docker load -i <monkdb_tar_image>
```

Once you successfully pull our docker image, ensure its presence by running the below command.

```bash
$ docker images
```

It should give an output something like below. 

```bash
$ docker images
REPOSITORY                                    TAG        IMAGE ID       CREATED        SIZE
public.ecr.aws/monkdblabs/monkdblabs/monkdb   2025.3.1   9ff1cd7f2fe1   47 hours ago   907MB
```

Now run the docker image in daemon mode/background mode. 

```bash
$ docker run -d --publish=4200:4200 --publish=5432:5432 --env MONKDB_HEAP_SIZE=4g --env MONKDB_INDICES_FIELDDATA_BREAKER_LIMIT=60% --net=monkdb --name=monkdb01 9ff1cd7f2fe1 -Cnetwork.host=_site_,_local_ -Cnode.name=monkdb01 -Cauth.host_based.config.0.user=monkdb -Cauth.host_based.config.0.address=_local_ -Cauth.host_based.config.0.method=trust -Cauth.host_based.config.99.method=password
```

+ MonkDB's docker image now runs in daemon mode (in the background). 
+ Port `4200` is our HTTP port. Clients like APIs can connect with this port to execute SQL queries over HTTP REST protocols.
+ Port `5432` is PostgreSQL port. We support `pgWire` and support the SQL dialect of PostgreSQL. Hence, this port is mapped.
+ `MONKDB_HEAP_SIZE` environment variable is set to 1GB in the above example. This is a portion of memory used by the Java Virtual Machine (JVM) to allocate objects during runtime. 
The heap size influences the performance of MonkDB running on the JVM. Hence, allocate according to the specifications of your host operating system and needs.
+ The `--net` key has a value of the name of the docker network created earlier.
+ We are giving a name to our container. Hence `--name` key has name value to it.
+ We have to pass the image id to docker run command to ensure docker engine spawns a container out of our image. In this case, the image id is `9ff1cd7f2fe1`.
+ The flag `network.host` has two values `_site_` which corresponds to the IP of the host OS and `_local_` corresponds to the localhost bind. MonkDB can be accessed from these two networks.
+ The flag `node.name` has the value of name of this node. This comes in handy when we are creating a cluster of MonkDB where each node has different name associations. This helps in scenarios such as leader election, cluster management, etc.
+ We are asking to create a database superuser named `monkdb` in the flag `auth.host_based.config.0.user`. We are mentioning that this superuser can access MonkDB only via localhost interface in `auth.host_based.config.0.address`. The authorization 
of this superuser is based on trust (without password) which is highlighted in `auth.host_based.config.0.method`. However, we are asking MonkDB to create password based authentication for other users in `auth.host_based.config.99.method`. In the above example,
we have used the password based authentication option. 

Please note that there are other options as well. Such as JWT based authentication, trust based authentication. The config document is pasted below. A user can leverage other flags as well and pass them as arguments to `docker run` command.

```yaml
######################## MonkDB Configuration File ##########################

# The default configuration offers the ability to use MonkDB right away.
# However, the purpose of this file is to give operators an overview of the various
# different configuration settings which can be applied on MonkDB.

# Use this file to fine-tune your MonkDB cluster for resiliency, speed, and security.

################################ Quick Settings ##############################

# Recommended memory settings:
# - Set the `MONKDB_HEAP_SIZE` environment variable to 25% of your total memory 
# (e.g., 16G, but not exceeding ~30G for CompressedOops benefits); 
# update `/etc/default/monkdb` or `/etc/sysconfig/monkdb` based on your OS.
#
#
# - disable swapping
#bootstrap.memory_lock : true

# MonkDB supports parallel storage across multiple volumes; 
# ensure the owner is set to `monkdb:monkdb`.
#path.data: /path/to/data1,/path/to/data2

# Clustering settings allow delaying recovery until a specified number 
# of data nodes are available, preventing unnecessary replica creation; 
# the expected node count also triggers health check warnings if the actual 
# number differs.
#gateway.expected_data_nodes: 5
#gateway.recover_after_data_nodes: 3

# Bind the node to an IP address or network interface other than localhost, 
# but ensure it is not exposed to the internet; options include a specific IP (e.g., 192.168.1.1), 
# _local_ (Loopback addresses), _site_ (Private, site-local addresses), 
# _global_(Public, globally routable addresses), or a _[networkInterface]_ like eth0.
#network.host: _site_

# Specify the hosts which will form the MonkDB cluster for discovery purposes at a
# cluster level.
#discovery.seed_hosts:
#    - host1
#    - host2

# To initialize the cluster, specify the master-eligible nodes that will participate in the election process. 
# Without this configuration, the cluster will be unable to elect an initial master node.
#
#cluster.initial_master_nodes:
#    - host1
#    - host2


################################# Full Settings ##############################

# The quick settings above cover most use cases, but the full list 
# of configuration options is provided below. Any setting can be replaced 
# with environment variables using `${...}` notation, for example:
#
#node.attr.rack: ${RACK_ENV_VAR}


#/////////////////////////// JMX Monitoring Plugin ///////////////////////////

# Enabling this switches on the `sys.jobs`, `sys.operations`, `sys.jobs_log` and
# `sys.operations_log` tables in MonkDB.
#stats.enabled: true

#//////////////////////// Database Administration ////////////////////////////

# Enable host-based authentication to allow authenticated access 
# to MonkDB from specific hosts.
# The default value is `false`.
auth.host_based.enabled: true

# Client access and authentication are managed through the host-based configuration, 
# which defines remote client access rules.
# The following example is a sane configuration that covers a common use case:
# * The predefined superuser monkdb has trusted access from localhost.
# * All other users must authenticate with a username and password from any location.
#  Note: Authentication is only available via the Postgres Protocol, so non-local 
# hosts cannot connect via HTTP with this setup.

auth:
  host_based:
    jwt:
    #     iss: http://example.com
    #     aud: example_aud
    config:
      0:
        user: monkdb
        address: _local_
        method: trust
      99:
        method: password

#With trust-based authentication, the server accepts the username provided 
# by the client without validation. For HTTP connections, the username is 
# extracted from the `Authorization: Basic ...` header. If this header is 
# missing, a default username can be specified as follows: 
# In `docker run` command pass it like `-Cauth.trust.http_default_user=johndoe`
#auth:
#  trust:
#    http_default_user: johndoe

#///////////////////////// User Defined Functions ////////////////////////////

# To disable JavaScript for user-defined functions, set the following 
# option (enabled by default):
#lang.js.enabled: false

#/////////////////////////////////  SSL //////////////////////////////////////

# Enable encryption for HTTP endpoints to secure communication.
#ssl.http.enabled: true

# Enable encryption for the PostgreSQL wire protocol to secure data transmission.:
#ssl.psql.enabled: true

# Specify the full path to the node keystore file.
#ssl.keystore_filepath: /path/to/keystore_file.jks

# Specify the password required to decrypt `keystore_file.jks`.
#ssl.keystore_password: myKeyStorePasswd

# Specify the password entered at the end of the `keytool -genkey` 
# command if it differs from the keystore password.
#ssl.keystore_key_password: myKeyStorePasswd

# Optional configuration for truststore

# Specify the full path to the node truststore file.
#ssl.truststore_filepath: /path/to/truststore_file.jks

# Specify the password required to decrypt `truststore_file.jks`.
#ssl.truststore_password: myTrustStorePasswd

# Specify how frequently SSL files are monitored for changes.
#ssl.resource_poll_interval: 5s

################################### Cluster ##################################

# The cluster name is used for auto-discovery; ensure it is unique if 
# running multiple clusters on the same network.
#cluster.name: monkdb

# The `graceful_stop` namespace configures the controlled shutdown of cluster nodes. 
# It defines the minimum data availability required when a node stops. By default, 
# only primary shards remain available, but options include `"full"` (ensuring replicas) 
# or `"none"` (no guarantee).
#cluster.graceful_stop.min_availability: primaries
#
# Specify the duration to wait for the reallocation process to complete.
#cluster.graceful_stop.timeout: 2h
#
# The `force` setting enables a forced shutdown of a node if the graceful shutdown 
# process exceeds `cluster.graceful_stop.timeout`.
#cluster.graceful_stop.force: false
#
# In most scenarios, allowing all types of shard allocations is recommended.
#cluster.routing.allocation.enable = all
#
# However, shard allocation can be restricted to specific types, 
# such as during a rolling cluster upgrade.
#cluster.routing.allocation.enable = new_primaries

#################################### Node ####################################

# Node names are dynamically generated at startup, eliminating the need 
# for manual configuration. However, you can assign a specific name if desired.
#node.name: "Piz Buin"

# Each node can be configured to allow or deny master eligibility and data storage. 
# By default, nodes are eligible to be master nodes.
#node.master: true
#
# Allow this node to store data; this setting is enabled by default.
#node.data: true

# These settings allow you to design advanced cluster topologies.
#
# 1. To prevent this node from becoming a master and only store data, 
#    configure it as a "workhorse" node.
#node.master: false
#node.data: true
#
# 2. To configure this node as a dedicated master, prevent it from 
#    storing data, allowing it to focus solely on cluster coordination 
#    and resource management.
#node.master: true
#node.data: false
#
# 3. To configure this node as a "search load balancer," disable both 
#    master and data roles, allowing it to fetch data from nodes, aggregate 
#    results, and distribute query loads efficiently.
#node.master: false
#node.data: false

# A node can have custom attributes assigned as key-value pairs, which can 
# be used for shard allocation filtering or allocation awareness. 
# Example: `node.attr.key: value`.
#node.attr.rack: rack314

# This setting determines whether memory-mapping is allowed; the default value is `true`.
#node.store.allow_mmap: true

#################################### Paths ###################################

# Relative paths are resolved based on `MONKDB_HOME`, while absolute paths take precedence.


# Specify the path to the directory containing configuration files, 
# including this file and `log4j2.properties`.
#path.conf: config

# Specify the path to the directory where table data for this node will be stored.
#path.data: data
#
# Multiple locations can be specified for data storage, enabling file-level 
# striping similar to RAID 0. The system prioritizes locations with the most 
# available free space during data creation. Example:
#path.data: /path/to/data1,/path/to/data2

# Complete path to log files:
#path.logs: logs

# An alternative syntax can be used for configuring path settings, 
# allowing a structured format for defining log, data directories.
#path:
#  logs: /var/log/monkdb
#  data: /var/lib/monkdb

# Specify the path to the directory where blob data for this node will be stored.
#blobs.path: blobs

# Allow FDW access to local filesystem for non-superusers
# fdw.allow_local: true

# See also: path.repo (further down)

################################### Memory ###################################

# MonkDB performance degrades significantly if the JVM starts swapping; 
# to prevent this, ensure it **never** swaps by setting this property 
# to `true` to lock memory.
#bootstrap.memory_lock: true

# Ensure the machine has sufficient memory allocated for MonkDB while 
# reserving enough for the operating system to function properly.
# You can allocate memory for MonkDB as follows:
#  - Set the `MONKDB_MIN_MEM` and `MONKDB_MAX_MEM` environment variables 
#    (recommended to be equal). Alternatively, use `MONKDB_HEAP_SIZE` 
#    to automatically set both to the same value.
#
# Ensure the MonkDB process can lock memory by setting `ulimit -l unlimited`.


############################## Network And HTTP ###############################

# By default, MonkDB binds to loopback addresses and listens on ports **4200-4300** 
# for HTTP traffic and **4300-4400** for node-to-node communication. If a port is 
# occupied, it automatically selects the next available one.  

# In addition to IPv4 and IPv6 addresses, special values can be used:
# _local_ Any loopback addresses on the system, for example 127.0.0.1.
# _site_ Any site-local addresses on the system, for example 192.168.0.1.
# _global_ Any globally-scoped addresses on the system, for example 8.8.8.8.
# _[networkInterface]_  Addresses of a network interface, for example _en0_.

# Specify the bind address explicitly, using an IPv4, IPv6, or special value.
#network.bind_host: 192.168.0.1

# Specify the address that other nodes will use to communicate with this node. 
# If not set, it is automatically determined, but it must be a valid IP address.
#network.publish_host: 192.168.0.1

# Specify both `bind_host` and `publish_host` to control where the node 
# binds for incoming connections and how it advertises itself to other nodes.
#network.host: 192.168.0.1

# Specify a custom port for node-to-node communication; the default is **4300**.
#transport.tcp.port: 4300

# Enable compression for node-to-node communication; it is disabled by default.
#transport.tcp.compress: true

# Specify a custom port for HTTP traffic.
#http.port: 4200

# Specify a custom maximum allowed content length for HTTP requests.:
#http.max_content_length: 100mb

################################### Gateway ##################################

# The gateway saves cluster metadata to disk whenever changes occur, 
# ensuring persistence across full cluster restarts and recovery 
# when nodes restart.

# Specify the minimum number of data nodes that must start before 
# initiating cluster state recovery.
#gateway.recover_after_data_nodes: 2

# Specify the wait time before starting recovery after the required number of nodes 
# (`gateway.recover_after_nodes`) have started.
#gateway.recover_after_time: 5m

# Specify the number of data nodes required for immediate cluster state 
# recovery; this value should match the total number of nodes in the cluster.
#gateway.expected_data_nodes: 3


############################ Recovery Throttling #############################

# These settings control shard allocation during initial recovery, replica assignment, 
# rebalancing, and when adding or removing nodes.  

# Specify the number of concurrent recoveries allowed per node:
#
# 1. Specify the number of concurrent recoveries allowed per node during the initial 
#    recovery phase.
#cluster.routing.allocation.node_initial_primaries_recoveries: 4
#
# 2. Specify the number of concurrent recoveries allowed per node during node addition, 
#    removal, or rebalancing.
#cluster.routing.allocation.node_concurrent_recoveries: 2

# Define the maximum data transfer rate for shard recovery per second; the default is **40MB**.
#indices.recovery.max_bytes_per_sec: 40mb

# Specify the wait time before retrying recovery after a cluster state sync issue occurs.
#indices.recovery.retry_delay_state_sync: 500ms

# Specify the wait time before retrying recovery after a network-related issue occurs.
#indices.recovery.retry_delay_network: 5s

# Define the time interval after which idle recoveries will be considered failed.
#indices.recovery.recovery_activity_timeout: 15m

# Define the timeout duration for internal requests during the recovery process.
#indices.recovery.internal_action_timeout: 15m

# Define the timeout for internal recovery requests that are expected to 
# take a long duration.
#indices.recovery.internal_long_action_timeout: 30m

# Specify the number of file chunk requests that can be sent in parallel during 
# recovery.
# indices.recovery.max_concurrent_file_chunks: 2


################################# Discovery ##################################

# The discovery mechanism enables nodes to locate each other within a cluster and 
# elect a master node. By default, **unicast discovery** is used, allowing explicit 
# control over which nodes participate in cluster discovery through pinging.
#discovery.seed_hosts:
#  - host1:port
#  - host2:port
#
# To debug the discovery process, configure a logger in **`config/log4j2.properties`** 
# for detailed logging.

# To initialize the cluster, specify the master-eligible nodes. Otherwise, the cluster cannot 
# elect an initial master node.
#
#cluster.initial_master_nodes: ["host1", "host2"]

#/////////////////////////// Discovery via DNS ///////////////////////////////

# Service discovery enables MonkDB to retrieve host information for unicast discovery 
# using **SRV DNS records**.

# To enable **SRV discovery**, set the discovery type to `'srv'`.
#discovery.seed_providers: srv

# Service discovery requires a query to retrieve **SRV records**, typically 
# formatted as `_service._protocol.fqdn`.
#discovery.srv.query: _monkdb._srv.example.com

#////////////////////////////// EC2 Discovery ////////////////////////////////

# EC2 discovery enables MonkDB to find hosts for unicast discovery using the 
# **AWS EC2 API**.

# To enable **EC2 discovery**, set the discovery type to `'ec2'`.
#discovery.seed_providers: ec2

# There are several methods to filter EC2 instances.
#
# Filter EC2 instances by security groups using their ID or name, ensuring 
# that only instances associated with the specified group are utilized for 
# unicast host discovery.
#discovery.ec2.groups: sg-example-1, sg-example-2
#
# Control whether all security groups (false) or just any security group (true) 
# must be present for the instance to qualify for discovery.
#discovery.ec2.any_group: true
#
# Filter EC2 instances by availability zones, ensuring that only instances 
# located within the specified zone are used for unicast host discovery.
#discovery.ec2.availability_zones:
#  - us-east-1
#  - us-west-1
#  - us-west-2
#  - ap-southeast-1
#  - ap-southeast-2
#  - ap-northeast-1
#  - eu-west-1
#  - eu-central-1
#  - sa-east-1
#  - cn-north-1
#
# EC2 instances for discovery can be filtered by tags using the discovery.ec2.tag. prefix 
# followed by the tag name. For example, to filter instances with the environment tag 
# set to dev, use the filter discovery.ec2.tag.environment=dev
#discovery.ec2.tag.environment: dev
#discovery.ec2.tag.<name>: <value>
#
# If you have your own compatible implementation of the EC2 API service, you can specify the 
# endpoint to be used by providing a custom URI.
#discovery.ec2.endpoind: http://example.com/endpoint

#/////////////////////////////// Azure Discovery /////////////////////////////

# Azure discovery enables MonkDB to look up hosts for unicast discovery using the Azure API.

# To enable Azure discovery, set the discovery type to `azure`.
#discovery.seed_providers: azure

# You need to provide the resource group name of your Azure instances, which 
# acts as a logical container for grouping related resources like virtual machines, 
# storage accounts, and databases, enabling better management and governance.
#cloud.azure.management.resourcegroup.name: myrg

# The following configuration values must be provided for Active Directory authentication:
# 1. Azure Tenant ID: The unique identifier of your Azure Active Directory tenant.
# 2. Client ID: The application (or service principal) ID registered in Azure AD.
# 3. Client Secret: The secret key associated with the application for secure authentication.
# 4. Azure Subscription ID- Subscription ID for your Azure environment. 
#cloud.azure.management.subscription.id: xxxxx.xxxx.xxx.xxx
#cloud.azure.management.tenant.id: xxxxxxxxxxx
#cloud.azure.management.app.id: xxxxxxxxxx
#cloud.azure.management.app.secret: my_password

# There are two methods of discovery in Azure:
# 1. The vnet method discovers all virtual machines within the same virtual network (VNet).
# 2. The subnet method discovers all virtual machines within the same subnet of a VNet.
#discovery.azure.method: vnet


############################# Routing Allocation #############################

# This setting controls shard allocation in MonkDB, with two options:
# 1. all: Allows all shard allocations. The cluster can allocate all types of shards, 
#    including primary and replica shards
# 2. new_primaries: Restricts allocations to new primary shards only. This means: Newly added 
# nodes will not receive replica shard allocations. @New primary shards can still be allocated 
# for new indices.

#Useful for zero-downtime cluster upgrades:
# Set to new_primaries before stopping the first node.
# Reset to all after starting the last updated node

# This setting is part of the cluster-level shard allocation controls, which manage 
# how MonkDB distributes shards across nodes for optimal performance and 
# resource utilization
#cluster.routing.allocation.enable: all

# Shard rebalancing in MonkDB can be controlled using the 
# `cluster.routing.allocation.allow_rebalance` setting, with the following options:
# 1. always: Rebalancing is enabled at all times.
# 2. indices_primary_active: Rebalancing occurs only when all primary shards in 
#    the cluster are active.
# 3. indices_all_active (default): Rebalancing happens only when all shards 
# (primary and replica) are active, reducing unnecessary activity during initial recovery
#cluster.routing.allocation.allow_rebalance: indices_all_active

# The number of concurrent rebalancing tasks allowed cluster-wide is controlled 
# by the setting cluster.routing.allocation.cluster_concurrent_rebalance, 
# which defaults to 2. This limit ensures that only two shard rebalancing tasks 
# occur simultaneously to prevent resource overload and maintain cluster stability.
#cluster.routing.allocation.cluster_concurrent_rebalance: 2

# The number of initial recoveries of primary shards allowed per node is controlled 
# by the setting `cluster.routing.allocation.node_initial_primaries_recoveries`. 
# This setting defaults to 4, allowing up to 4 primary shard recoveries to occur in 
# parallel on a single node. Since local gateway recoveries are typically fast, 
# this value can be increased to handle more recoveries per node without 
# overloading the system.
#cluster.routing.allocation.node_initial_primaries_recoveries: 4

# The number of concurrent recoveries allowed on a node is controlled by 
# the `cluster.routing.allocation.node_concurrent_recoveries setting`, 
# which defaults to 2. This includes both incoming and outgoing shard recoveries
#cluster.routing.allocation.node_concurrent_recoveries: 2


################################## Awareness #################################

# Cluster allocation awareness in MonkDB allows you to configure shard 
# and replica allocation across generic attributes associated with nodes, such 
# as racks or availability zones. By specifying awareness attributes (e.g., rack_id or zone), 
# MonkDB ensures that primary and replica shards are distributed across different 
# nodes with distinct attribute values, enhancing fault tolerance and minimizing 
# the risk of data loss during failures

# To define node attributes for shard allocation awareness, you can use the 
# `cluster.routing.allocation.awareness.attributes` setting. For example, 
# to ensure that a shard and its replicas are not allocated to nodes with 
# the same rack_id value:
# 1. Set Node Attributes: Assign a custom attribute (e.g., rack_id) to each node 
#    in the MonkDB.yml file or via startup parameters.
# 2. Enable Awareness: Configure the cluster to consider the attribute by setting:
# `cluster.routing.allocation.awareness.attributes: rack_id`
# This ensures shards and their replicas are distributed across nodes with different 
# `rack_id` values, enhancing fault tolerance
#
# The awareness attributes can hold several values
#cluster.routing.allocation.awareness.attributes:

# To force shard allocation based on node attributes, use the 
# `cluster.routing.allocation.awareness.force.*` settings. This 
# ensures that shards and replicas are allocated only to nodes with 
# specific attribute values, preventing over-allocation in a single 
# group of nodes.
#cluster.routing.allocation.awareness.force.<attribute>.values:


############################### Balanced Shards ##############################

# The weight factor for shards allocated on a node is defined by the setting 
# `cluster.routing.allocation.balance.shard`, which is a float value that influences 
# shard distribution to ensure balanced workloads across nodes
#cluster.routing.allocation.balance.shard: 0.45f

# The factor controlling the number of shards per index allocated on a specific 
# node is defined by the setting `cluster.routing.allocation.balance.index`, 
# which is a float value. This setting helps balance shard distribution across 
# nodes for individual indices.
#cluster.routing.allocation.balance.index: 0.5f

## In MonkDB, the settings cluster.routing.allocation.balance.shard and 
## cluster.routing.allocation.balance.index cannot both be set to 0.0f, as this would 
## disable the balancing logic for shard allocation and indexing, potentially 
## leading to an unbalanced cluster state where shards are not distributed effectively 
## across nodes


# The weight factor for the number of primary shards of a specific index allocated on a 
# node is defined by the setting `cluster.routing.allocation.balance.index`, which is a 
# float value. This setting influences how MonkDB balances the allocation of 
# primary shards across nodes, ensuring that no single node becomes overloaded with 
# primary shards from a particular index.
#cluster.routing.allocation.balance.primary: 0.05f

# The minimal optimization value of operations that should be performed in 
# MonkDB is defined by the setting `cluster.routing.allocation.balance.threshold`, 
# which is a non-negative float. The default value is 1.0f. Increasing this value can lead to 
# more efficient resource usage and improved performance during shard allocation and 
# recovery processes.
#cluster.routing.allocation.balance.threshold: 1.0f


####################### Cluster-Wide Allocation Filtering ####################

# To place new shards only on nodes where one of the specified values matches 
# an attribute, use the cluster.routing.allocation.include.<attribute> setting
#cluster.routing.allocation.include.<attribute>:

# To place new shards only on nodes where none of the specified values matches an attribute, 
# use the `cluster.routing.allocation.exclude.<attribute>` setting
#cluster.routing.allocation.exclude.<attribute>:

# The setting cluster.routing.allocation.require.<attribute> specifies rules for 
# shard allocation where all rules must match for a node to be eligible to 
# host a shard. This contrasts with the include setting, which allocates shards 
# if any rule matches.
#cluster.routing.allocation.require.<attribute>:


########################## Disk-based Shard Allocation #######################

# To prevent shard allocation on nodes based on disk usage, MonkDB provides 
# the setting `cluster.routing.allocation.disk.threshold_enabled`, which is enabled 
# by default (true). This setting ensures that disk-based shard allocation decisions 
# are made to avoid overloading nodes with insufficient disk space
#cluster.routing.allocation.disk.threshold_enabled: true

# The setting cluster.routing.allocation.disk.watermark.low defines the 
# lower disk threshold limit for shard allocation in MonkDB. By default, 
# it is set to 85%, meaning that new shards will not be allocated to nodes with 
# more than 85% disk usage. Alternatively, it can also be set to an absolute value, 
# such as 500mb, to prevent shard allocation on nodes with less than the specified 
# free disk space
#cluster.routing.allocation.disk.watermark.low: 85%

# The setting cluster.routing.allocation.disk.watermark.high defines the higher disk 
# threshold limit for shard allocation in MonkDB. By default, it is set to 90%, 
# meaning:
# 1. **Relocation Trigger**: If a node's disk usage exceeds 90%, MonkDb will attempt 
#    to relocate shards from that node to other nodes with sufficient disk space.
# 2. **New Shard Allocation Block**: New shards will not be allocated to nodes exceeding 
#    this threshold.
# This value can also be set to an absolute amount of free disk space (e.g., 500mb) 
# instead of a percentage. Adjusting this setting helps prevent nodes from running 
# out of disk space and ensures cluster stability by redistributing shards as needed
#cluster.routing.allocation.disk.watermark.high: 90%

# The setting cluster.routing.allocation.disk.watermark.flood_stage in MonkDB 
# defines the threshold at which a read-only block is enforced on every index that 
# has at least one shard (primary or replica) allocated on a node where disk usage 
# exceeds this value. By default, it is set to 95%.
#cluster.routing.allocation.disk.watermark.flood_stage: 95%


########################## Field Data Circuit Breaker #########################

# The field data circuit breaker in MonkDB estimates the memory required for 
# loading field data into memory, helping prevent out-of-memory errors.

# The setting indices.breaker.fielddata.limit specifies the maximum amount of 
# memory that can be allocated for fielddata in MonkDB. By default, 
# this limit is set to 40% of the JVM heap, but it can be adjusted based on 
# specific use cases and resource availability
#indices.fielddata.breaker.limit: 60%

# The setting indices.fielddata.breaker.overhead is a constant used by MonkDB to 
# multiply the theoretical memory estimation for field data to calculate the final 
# memory requirement. By default, this value is set to 1.03, which means a 3% 
# overhead is added to the estimated memory usage.
#indices.fielddata.breaker.overhead: 1.0.3


################################# Threadpools ################################

# MonkDB nodes use several thread pools to manage tasks efficiently and optimize 
# resource usage.
#thread_pool.index.type: fixed
#thread_pool.index.queue_size: 200


################################## Metadata ##################################

# The setting cluster.info.update.interval in MonkDB defines how often the 
# cluster collects metadata information, such as disk usage, if no specific event 
# triggers an update. By default, it is set to 30s, meaning the cluster will refresh 
# its metadata every 30 seconds.
#cluster.info.update.interval: 30s


################################## GC Logging ################################

#monitor.jvm.gc.collector.young.warn: 1000ms
#monitor.jvm.gc.collector.young.info: 700ms
#monitor.jvm.gc.collector.young.debug: 400ms

#monitor.jvm.gc.collector.old.warn: 10s
#monitor.jvm.gc.collector.old.info: 5s
#monitor.jvm.gc.collector.old.debug: 2s


###################################### SQL ####################################

# The setting node.sql.read_only in MonkDB determines whether SQL statements that 
# result in modification operations (e.g., INSERT, UPDATE, DELETE) are allowed 
# on the node.
#node.sql.read_only: false

# To execute SQL DML operations over a large number of rows in MonkDB, such 
# as INSERT FROM SUBQUERY, UPDATE, or COPY FROM, you can increase the timeout to 
# ensure the operation completes successfully, even on slower hardware or under 
# heavy cluster load.
#bulk.request_timeout: 1m


######################### SQL Query Circuit Breaker ##########################

# The query circuit breaker in MonkDB estimates the memory required for executing 
# queries and prevents excessive memory usage that could lead to OutOfMemoryError. 
# It is part of the request circuit breaker, which specifically tracks memory usage 
# for queries and aggregations.

# The setting indices.breaker.query.limit specifies the memory limit for the query 
# circuit breaker in MonkDB. This circuit breaker prevents queries from consuming 
# excessive memory, which could lead to performance issues or OutOfMemoryError
#indices.breaker.query.limit: 60%

# The setting indices.breaker.query.overhead in MonkDB defines a constant 
# multiplier applied to the estimated memory usage of a query to determine the final 
# memory requirement. This overhead accounts for inaccuracies in memory estimation and 
# ensures the circuit breaker trips before the actual memory usage exceeds the 
# configured limit.
#indices.breaker.query.overhead: 1.09


##################################### UDC ####################################

# Usage Data Collection
#
# If enabled MonkDB will send usage data to the url stored in setting
# `udc.url`. The sent usage data doesn't contain any confidential information.

# A user can enable/disable usage data collection at all
#udc.enabled: true

# The delay for first ping after start-up. A user can configure based on their
# requirements.
#udc.initial_delay: 10m

# The setting udc.interval specifies the interval at which a ping is sent. 
# This configuration is crucial for maintaining connectivity and ensuring that 
# the system can monitor the health and status of nodes effectively.
#udc.interval: 24h

# The setting udc.url specifies the URL to which a ping is sent for monitoring 
# or health check purposes.
#udc.url: https://udc.monkdb.com/


############################# BACKUP / RESTORE ###############################

# To configure the paths where repositories of type fs (file system) may be created in MonkDB, 
# you can use the path.repo setting
#path.repo: /path/to/shared/fs,/other/shared/fs

# The configuration for URL repositories in MonkDB allows specifying a 
# list of URLs that can be used with the URL repository type. This setting 
# is crucial for defining where snapshots can be stored and retrieved from 
# when using URL-based repositories.
#
# Supported protocols are: "http", "https", "ftp", "file" and "jar"
# While only "http", "https" and "ftp" need to be listed here for usage in
# URL repsoitories.
# "file" urls must be prefixed with an entry configured in ``path.repo``
#repositories.url.allowed_urls: ["http://example.org/root/*", "https://*.mydomain.com/*?*#*"]

###################### POSTGRES WIRE PROTOCOL SUPPORT ########################

# MonkDB supports the PostgreSQL wire protocol v3 and emulates a PostgreSQL 
# server version 10.5. This compatibility allows users to connect to MonkDB 
# using tools and libraries designed for PostgreSQL, enabling seamless integration 
# with existing PostgreSQL-based workflows and ecosystems.
#psql.enabled: true
#psql.port: 5432
```

Once the above docker run command is executed, please ensure that the spawned container is in `running` state. Execute the below command to check the status.

```bash
$ docker ps
```

If you get an output, it means MonkDB's container is running successfully. An empty output means the container has exited. Check the logs and observe the reason for exit, and make corrective actions. A successful output usually looks like below.

```bash
$ docker ps
CONTAINER ID   IMAGE          COMMAND                  CREATED         STATUS         PORTS                                                                                                NAMES
30e69494c2e3   9ff1cd7f2fe1   "/docker-entrypoint.…"   6 seconds ago   Up 5 seconds   0.0.0.0:4200->4200/tcp, [::]:4200->4200/tcp, 0.0.0.0:5432->5432/tcp, [::]:5432->5432/tcp, 4300/tcp   monkdb01
```

---

## Creating a normal user in MonkDB

Now it is time to create a normal user in the database. We must leverage this user and not the superuser in clients to connect with MonkDB.

```bash
# Connect to MonkDB
$ psql -h localhost -p 5432 -U monkdb -d monkdb
```

The below SQL statement creates a new user named `testuser` with a password `testpassword`.
This is for illustration purposes only. You may create a username and password combo based on your organization's standards & practices. 
```psql
CREATE USER testuser WITH (password = 'testpassword');
```

Grant need-based/role-based privileges to the newly provisioned user.

```psql
GRANT ALL PRIVILEGES TO testuser;
```

---

## Environment Related Information

We have executed all the commands listed in this document in Ubuntu with the below specifications.

```bash
$ uname -m
x86_64
```

```bash
$ lsb_release --all
Distributor ID:	Ubuntu
Description:	Ubuntu 24.04.2 LTS
Release:	24.04
Codename:	noble
```

### Environment Specs

+ **Sandbox environment**: We leverage `m6in.2xlarge` instance family in AWS EC2 with a *100 GiB* EBS mount. 
+ **Production environment**: We recommend `m6in` instances in AWS or equivalents in other clouds and on-premises environments for a great performance.
