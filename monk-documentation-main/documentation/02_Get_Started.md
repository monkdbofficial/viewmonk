# Get Started

MonkDB has dependencies on Docker engine and PSQL interface. 

Docker engine to run our docker image, and psql to create a super user in MonkDB before leveraging our SDKs. 

A user must ensure they are installed before they run MonkDB's docker image.

---
## 1. PSQL Installation

We want to credit **RisingWave's** [documentation](https://docs.risingwave.com/deploy/install-psql-without-postgresql) for listing out the steps to install PG drivers.

PSQL package must be installed (preferably using package managers). 

### `deb` based derivatives like Debian and Ubuntu

For Ubuntu and Debian systems, invoke the below commands. First update the packages which have been installed.

```bash
$ sudo apt -y update
```

Then install the client driver of postgresql. 

```bash
$ sudo apt install -y postgresql-client
```

### `yum` Based Derivatives like Amazon Linux, RHEL, CentOS, AlmaLinux, etc

Install the repository RPM to point YUM at the PostgreSQL repository.

Go to [Linux Downloads (Red Hat Family)](https://www.postgresql.org/download/linux/redhat/) and select your platform for the command and repository URL.

Invoke the below command to install pg client.

```bash
$ sudo yum install -y postgresql
```

### Fedora

Use `dnf` package manager to install PG's client driver.

```bash
$ sudo dnf install -y postgresql.x86_64
```

### MacOS

Use `homebrew` to install postgresql driver. 

**FYI**: Please install `homebrew` if it isn't available in your system.

First update the packages/formulae. 

```zsh
$ brew update
```
Homebrew’s package for the PostgreSQL client tools is `libpq`, which includes `psql`, `pg_dump`, and other client utilities.

```zsh
$ brew install libpq
```

Link all binaries of `libpq` to `/usr/local/bin`. 

`libpq` does not install itself in the `/usr/local/bin` directory. Thus, you need to link them to the directory to use the installed binaries.

```zsh
$ brew link --force libpq
```

### Windows

For Windows users, please use the interactive installer by [EDB](https://www.postgresql.org/download/windows/).

This is the usual way of installing PostgreSQL on Windows. But to install the client only, select Command Line Tools and uncheck other options when selecting components during installation.

---

## 2. Docker Engine

Use Docker's [manual](https://docs.docker.com/engine/install/) to install docker engine on the host operating system.

Ensure your host OS is compliant with `AMD64` or `ARM64` as our docker image is built to support these platform architectures. 

We are still not supporting Windows architecture. We shall be launching support for Windows very soon.

Till then, as mentioned before please ensure host operating system is compliant with `ARM64` or `AMD64`. Our `AMD64` docker image also supports `x86_64` platform architecture.

---