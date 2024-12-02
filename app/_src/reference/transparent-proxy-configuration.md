---
title: Transparent Proxy Configuration
content_type: reference
---

{% assign docs = "/docs/" | append: page.release %}
{% assign Kuma = site.mesh_product_name %}

{% assign noflag = "# can't be modified via CLI flag" %}

During transparent proxy installation {{ Kuma }} under the hood is using a common structure, which can be modified in multiple different ways. By modifying it you are able to for example exclude some ports or IPs from transparent proxy redirection, configure if it should handle both IPv4 and IPv6 or just IPv4 traffic and more.

## Simplified reference

This section provides a simplified version of the [Full Reference](#full-reference). It's useful when you want to view the entire configuration in context without diving into the specifics of each individual setting.

### Schema

Below is a concise schema of the transparent proxy configuration, including default values:

```yaml
# The username or UID of the user that will run kuma-dp
kumaDPUser: string
# The IP family mode used for configuring traffic redirection in the transparent proxy
ipFamilyMode: enum # default: "dualstack"
redirect:
  inbound:
    # Enables inbound traffic redirection
    enabled: bool # default: true
    # Port used for redirecting inbound traffic
    port: Port # default: 15006
    # List of ports to include in inbound traffic redirection
    includePorts: []Port
    # List of ports to exclude from inbound traffic redirection
    excludePorts: []Port
    # List of IP addresses to exclude from inbound traffic redirection for specific ports
    excludePortsForIPs: []string
    # List of UIDs to exclude from inbound traffic redirection for specific ports
    excludePortsForUIDs: []string
    # Inserts the redirection rule at the beginning of the chain instead of appending it
    insertRedirectInsteadOfAppend: bool
  outbound:
    # Enables outbound traffic redirection
    enabled: bool # default: true
    # Port used for redirecting outbound traffic
    port: Port # default: 15001
    # List of ports to include in outbound traffic redirection
    includePorts: []Port
    # List of ports to exclude from outbound traffic redirection
    excludePorts: []Port
    # List of IP addresses to exclude from outbound traffic redirection for specific ports
    excludePortsForIPs: []string
    # List of UIDs to exclude from outbound traffic redirection for specific ports
    excludePortsForUIDs: []string
    # Inserts the redirection rule at the beginning of the chain instead of appending it
    insertRedirectInsteadOfAppend: bool
  dns:
    # Enables DNS redirection in the transparent proxy
    enabled: bool
    # The port on which the DNS server listens
    port: Port # default: 15053
    # Redirect all DNS queries
    captureAll: bool
    # Disables conntrack zone splitting, which can prevent potential DNS issues
    skipConntrackZoneSplit: bool
    # Path to the system's resolv.conf file
    resolvConfigPath: string # default: "/etc/resolv.conf"
  vnet:
    # Specifies virtual networks using the format interfaceName:CIDR
    networks: []string
ebpf:
  # Enables eBPF support for handling traffic redirection in the transparent proxy
  enabled: bool
  instanceIP: string
  # The name of the environment variable containing the IP address of the instance (pod/vm) where transparent proxy will be installed
  instanceIPEnvVarName: string
  # The path of the BPF filesystem
  bpffsPath: string # default: "/run/kuma/bpf"
  # The path of cgroup2
  cgroupPath: string # default: "/sys/fs/cgroup"
  # Path where compiled eBPF programs and other necessary files for eBPF mode can be found
  programsSourcePath: string # default: "tmp/kuma-ebpf"
  # The network interface for TC eBPF programs to bind to
  tcAttachIface: string
retry:
  # The maximum number of retry attempts for operations
  maxRetries: uint # default: 4
  # The time duration to wait between retry attempts
  sleepBetweenRetries: Duration # default: "2s"
iptablesExecutables:
  # Custom path for the iptables executable (IPv4)
  iptables: string
  # Custom path for the iptables-save executable (IPv4)
  iptables-save: string
  # Custom path for the iptables-restore executable (IPv4)
  iptables-restore: string
  # Custom path for the ip6tables executable (IPv6)
  ip6tables: string
  # Custom path for the ip6tables-save executable (IPv6)
  ip6tables-save: string
  # Custom path for the ip6tables-restore executable (IPv6)
  ip6tables-restore: string
log:
  # Specifies the log level for iptables logging as defined by netfilter
  level: enum # default: 7
  # Enables logging of iptables rules for diagnostics and monitoring
  enabled: bool
comments:
  # Disables comments in the generated iptables rules
  disabled: bool
# Time in seconds to wait for acquiring the xtables lock before failing
wait: uint # default: 5
# Time interval between retries to acquire the xtables lock in seconds
waitInterval: uint
# Drops invalid packets to avoid connection resets in high-throughput scenarios
dropInvalidPackets: bool
# Enables firewalld support to store iptables rules
storeFirewalld: bool
cniMode: bool
dryRun: bool
# Enables verbose mode with longer argument/flag names and additional comments
verbose: bool
```

**Custom Types**

- `Port` - uint16 value greater than `0`
- `Duration` - string representation of time duration, that is `"10s"`, `"20m"`, `"1h"` etc.

### Environment variables

The following structure lists the settings along with their corresponding environment variables for customization:

```yaml
kumaDPUser: KUMA_TRANSPARENT_PROXY_KUMA_DP_USER
ipFamilyMode: KUMA_TRANSPARENT_PROXY_IP_FAMILY_MODE
redirect:
  inbound:
    enabled: KUMA_TRANSPARENT_PROXY_REDIRECT_INBOUND_ENABLED
    port: KUMA_TRANSPARENT_PROXY_REDIRECT_INBOUND_PORT
    includePorts: KUMA_TRANSPARENT_PROXY_REDIRECT_INBOUND_INCLUDE_PORTS
    excludePorts: KUMA_TRANSPARENT_PROXY_REDIRECT_INBOUND_EXCLUDE_PORTS
    excludePortsForIPs: KUMA_TRANSPARENT_PROXY_REDIRECT_INBOUND_EXCLUDE_PORTS_FOR_IPS
    excludePortsForUIDs: KUMA_TRANSPARENT_PROXY_REDIRECT_INBOUND_EXCLUDE_PORTS_FOR_UIDS
    insertRedirectInsteadOfAppend: KUMA_TRANSPARENT_PROXY_REDIRECT_INBOUND_INSERT_REDIRECT_INSTEAD_OF_APPEND
  outbound:
    enabled: KUMA_TRANSPARENT_PROXY_REDIRECT_OUTBOUND_ENABLED
    port: KUMA_TRANSPARENT_PROXY_REDIRECT_OUTBOUND_PORT
    includePorts: KUMA_TRANSPARENT_PROXY_REDIRECT_OUTBOUND_INCLUDE_PORTS
    excludePorts: KUMA_TRANSPARENT_PROXY_REDIRECT_OUTBOUND_EXCLUDE_PORTS
    excludePortsForIPs: KUMA_TRANSPARENT_PROXY_REDIRECT_OUTBOUND_EXCLUDE_PORTS_FOR_IPS
    excludePortsForUIDs: KUMA_TRANSPARENT_PROXY_REDIRECT_OUTBOUND_EXCLUDE_PORTS_FOR_UIDS
    insertRedirectInsteadOfAppend: KUMA_TRANSPARENT_PROXY_REDIRECT_OUTBOUND_INSERT_REDIRECT_INSTEAD_OF_APPEND
  dns:
    enabled: KUMA_TRANSPARENT_PROXY_REDIRECT_DNS_ENABLED
    port: KUMA_TRANSPARENT_PROXY_REDIRECT_DNS_PORT
    captureAll: KUMA_TRANSPARENT_PROXY_REDIRECT_DNS_CAPTURE_ALL
    skipConntrackZoneSplit: KUMA_TRANSPARENT_PROXY_REDIRECT_DNS_SKIP_CONNTRACK_ZONE_SPLIT
    resolvConfigPath: KUMA_TRANSPARENT_PROXY_REDIRECT_DNS_RESOLV_CONFIG_PATH
  vnet:
    networks: KUMA_TRANSPARENT_PROXY_REDIRECT_VNET_NETWORKS
ebpf:
  enabled: KUMA_TRANSPARENT_PROXY_EBPF_ENABLED
  instanceIP: KUMA_TRANSPARENT_PROXY_EBPF_INSTANCE_IP
  instanceIPEnvVarName: KUMA_TRANSPARENT_PROXY_EBPF_INSTANCE_IP_ENV_VAR_NAME
  bpffsPath: KUMA_TRANSPARENT_PROXY_EBPF_BPFFS_PATH
  cgroupPath: KUMA_TRANSPARENT_PROXY_EBPF_CGROUP_PATH
  programsSourcePath: KUMA_TRANSPARENT_PROXY_EBPF_PROGRAMS_SOURCE_PATH
  tcAttachIface: KUMA_TRANSPARENT_PROXY_EBPF_TC_ATTACH_IFACE
retry:
  maxRetries: KUMA_TRANSPARENT_PROXY_RETRY_MAX_RETRIES
  sleepBetweenRetries: KUMA_TRANSPARENT_PROXY_RETRY_SLEEP_BETWEEN_RETRIES
iptablesExecutables: KUMA_TRANSPARENT_PROXY_IPTABLES_EXECUTABLES
log:
  enabled: KUMA_TRANSPARENT_PROXY_LOG_ENABLED
  level: KUMA_TRANSPARENT_PROXY_LOG_LEVEL
comments:
  disabled: KUMA_TRANSPARENT_PROXY_COMMENTS_DISABLED
wait: KUMA_TRANSPARENT_PROXY_WAIT
waitInterval: KUMA_TRANSPARENT_PROXY_WAIT_INTERVAL
dropInvalidPackets: KUMA_TRANSPARENT_PROXY_DROP_INVALID_PACKETS
storeFirewalld: KUMA_TRANSPARENT_PROXY_STORE_FIREWALLD
cniMode: KUMA_TRANSPARENT_PROXY_CNI_MODE
dryRun: KUMA_TRANSPARENT_PROXY_DRY_RUN
verbose: KUMA_TRANSPARENT_PROXY_VERBOSE
```

### CLI flags

This structure outlines the settings and their associated CLI flags for modification:

```yaml
kumaDPUser: --kuma-dp-user
ipFamilyMode: --ip-family-mode
redirect:
  dns:
    enabled: --redirect-dns
    port: --redirect-dns-port
    captureAll: --redirect-all-dns-traffic
    skipConntrackZoneSplit: --skip-dns-conntrack-zone-split
    resolvConfigPath: {{ noflag }}
  inbound:
    enabled: --redirect-inbound
    port: --redirect-inbound-port
    includePorts: {{ noflag }}
    excludePorts: --exclude-inbound-ports
    excludePortsForIPs: --exclude-inbound-ips
    excludePortsForUIDs: {{ noflag }}
    insertRedirectInsteadOfAppend: --redirect-inbound-insert-instead-of-append
  outbound:
    enabled: {{ noflag }}
    port: --redirect-outbound-port
    includePorts: {{ noflag }}
    excludePorts: --exclude-outbound-ports
    excludePortsForIPs: --exclude-outbound-ips
    excludePortsForUIDs: --exclude-outbound-ports-for-uids
    insertRedirectInsteadOfAppend: --redirect-outbound-insert-instead-of-append
  vnet:
    networks: --vnet
ebpf:
  enabled: --ebpf-enabled
  instanceIP: --ebpf-instance-ip
  instanceIPEnvVarName: {{ noflag }}
  bpffsPath: --ebpf-bpffs-path
  cgroupPath: --ebpf-cgroup-path
  programsSourcePath: --ebpf-programs-source-path
  tcAttachIface: --ebpf-tc-attach-iface
retry:
  maxRetries: --max-retries
  sleepBetweenRetries: --sleep-between-retries
iptablesExecutables: --iptables-executables
log:
  enabled: --iptables-logs
  level: {{ noflag }}
comments:
  disabled: --disable-comments
wait: --wait
waitInterval: --wait-interval
dropInvalidPackets: --drop-invalid-packets
storeFirewalld: --store-firewalld
cniMode: {{ noflag }}
dryRun: --dry-run
verbose: --verbose
```

### Default values

Here is a configuration that only shows the settings with their default values:

```yaml
ipFamilyMode: "dualstack"
redirect:
  inbound:
    enabled: true
    port: 15006
  outbound:
    enabled: true
    port: 15001
  dns:
    port: 15053
    resolvConfigPath: "/etc/resolv.conf"
ebpf:
  bpffsPath: "/run/kuma/bpf"
  cgroupPath: "/sys/fs/cgroup"
  programsSourcePath: "/tmp/kuma-ebpf"
retry:
  maxRetries: 4
  sleepBetweenRetries: "2s"
log:
  level: 7
wait: 5
```

### Control plane runtime configuration

Below is a subset of the [control plane configuration]({{ docs }}/documentation/configuration/) focused on transparent proxy settings, with default values and corresponding environment variables for each field.

```yaml
runtime:
  kubernetes:
    injector:
      cniEnabled: false # KUMA_RUNTIME_KUBERNETES_INJECTOR_CNI_ENABLED
      applicationProbeProxyPort: 9001 # KUMA_RUNTIME_KUBERNETES_APPLICATION_PROBE_PROXY_PORT
      sidecarContainer:
        uid: 5678 # KUMA_RUNTIME_KUBERNETES_INJECTOR_SIDECAR_CONTAINER_UID
        ipFamilyMode: dualstack # KUMA_RUNTIME_KUBERNETES_INJECTOR_SIDECAR_CONTAINER_IP_FAMILY_MODE
        redirectPortInbound: 15006 # KUMA_RUNTIME_KUBERNETES_INJECTOR_SIDECAR_CONTAINER_REDIRECT_PORT_INBOUND
        redirectPortOutbound: 15001 # KUMA_RUNTIME_KUBERNETES_INJECTOR_SIDECAR_CONTAINER_REDIRECT_PORT_OUTBOUND
      sidecarTraffic:
        excludeInboundPorts: [] # KUMA_RUNTIME_KUBERNETES_SIDECAR_TRAFFIC_EXCLUDE_INBOUND_PORTS
        excludeOutboundPorts: [] # KUMA_RUNTIME_KUBERNETES_SIDECAR_TRAFFIC_EXCLUDE_OUTBOUND_PORTS
        excludeInboundIPs: [] # KUMA_RUNTIME_KUBERNETES_SIDECAR_TRAFFIC_EXCLUDE_INBOUND_IPS
        excludeOutboundIPs: [] # KUMA_RUNTIME_KUBERNETES_SIDECAR_TRAFFIC_EXCLUDE_OUTBOUND_IPS
      builtinDNS:
        enabled: true # KUMA_RUNTIME_KUBERNETES_INJECTOR_BUILTIN_DNS_ENABLED
        port: 15053 # KUMA_RUNTIME_KUBERNETES_INJECTOR_BUILTIN_DNS_PORT
      ebpf:
        enabled: false # KUMA_RUNTIME_KUBERNETES_INJECTOR_EBPF_ENABLED
        instanceIPEnvVarName: INSTANCE_IP # KUMA_RUNTIME_KUBERNETES_INJECTOR_EBPF_INSTANCE_IP_ENV_VAR_NAME
        bpffsPath: /sys/fs/bpf # KUMA_RUNTIME_KUBERNETES_INJECTOR_EBPF_BPFFS_PATH
        cgroupPath: /sys/fs/cgroup # KUMA_RUNTIME_KUBERNETES_INJECTOR_EBPF_CGROUP_PATH
        tcAttachIface: "" # KUMA_RUNTIME_KUBERNETES_INJECTOR_EBPF_TC_ATTACH_IFACE
        programsSourcePath: /tmp/kuma-ebpf # KUMA_RUNTIME_KUBERNETES_INJECTOR_EBPF_PROGRAMS_SOURCE_PATH
```

### Annotations

Below you can find a list of Kubernetes annotations that can be used to configure specific transparent proxy settings.

- `traffic.kuma.io/exclude-inbound-ips`

- `traffic.kuma.io/exclude-inbound-ports`

- `traffic.kuma.io/exclude-outbound-ips`

- `traffic.kuma.io/exclude-outbound-ports`

- `traffic.kuma.io/exclude-outbound-ports-for-uids`

- `traffic.kuma.io/drop-invalid-packets`

- `traffic.kuma.io/iptables-logs`

- `kuma.io/transparent-proxying-ebpf`

- `kuma.io/transparent-proxying-ebpf-bpf-fs-path`

- `kuma.io/transparent-proxying-ebpf-cgroup-path`

- `kuma.io/transparent-proxying-ebpf-tc-attach-iface`

- `kuma.io/transparent-proxying-ebpf-instance-ip-env-var-name`

- `kuma.io/transparent-proxying-ebpf-programs-source-path`

- `kuma.io/transparent-proxying-ip-family-mode`

The following annotations also affect the configuration, but their values are automatically managed by {{ Kuma }} and cannot be manually adjusted. Values of these annotations will always match those specified in the [control plane runtime configuration]({{ docs }}/networking/transparent-proxy/kubernetes/#control-plane-runtime-configuration). For more details, refer to [Settings restricted to control plane runtime configuration]({{ docs }}/networking/transparent-proxy/kubernetes/#settings-restricted-to-control-plane-runtime-configuration) section.

- `kuma.io/sidecar-uid`

- `kuma.io/transparent-proxying-inbound-port`

- `kuma.io/transparent-proxying-outbound-port`

{% danger %}
⚠️ IMPORTANT
{:.custom-block-title}

The following two annotations are deprecated and will be removed in future releases. They are provided here for reference only and **should not be used**:

- `kuma.io/builtin-dns`
- `kuma.io/builtin-dns-port`

If you use these annotations while the [**Configuration in ConfigMap**]({{ docs }}/networking/transparent-proxy/kubernetes/#configuration-in-configmap-experimental) feature is enabled, they will be ignored, and a warning will be logged in the control plane.

**However**, if this feature is disabled, changes from these annotations may still apply, potentially causing DNS redirection issues. This happens because the transparent proxy will be configured with the values specified in the annotations, while the rest of the system will use values from the [**control plane runtime configuration**]({{ docs }}/networking/transparent-proxy/kubernetes/#control-plane-runtime-configuration). This mismatch could prevent `kuma-dp` from starting the DNS server or listening on the correct port, potentially disrupting the environment.
{% enddanger %}


The following annotation indirectly adjusts the transparent proxy configuration by configuring other components, resulting in changes to the transparent proxy behavior. While its value is automatically set by {{ Kuma }}, you can override it by manually providing a value.

- `kuma.io/application-probe-proxy-port`

  This annotation defines the port (default: `9001`) to be excluded from incoming traffic redirection, similar to using the `traffic.kuma.io/exclude-inbound-ports` annotation or other configuration methods. For more information, refer to the [Kubernetes]({{ docs }}/policies/service-health-probes/#kubernetes) section in the [Service Health Probes]({{ docs }}/policies/service-health-probes/) documentation.

The following annotations differ from others mentioned earlier as they are related to the transparent proxy, but do not directly or indirectly configure specific individual settings.

- `kuma.io/transparent-proxying`

  This annotation is automatically applied to workloads with [injected sidecar containers]({{ docs }}/production/dp-config/dpp-on-kubernetes/#kubernetes-sidecar-containers). In Kubernetes environments, the transparent proxy is mandatory meaning you cannot disable it. Any attempt to explicitly disable it using this annotation will trigger a warning and have no effect. Therefore, the value of this annotation will always be set to `true`.

- `traffic.kuma.io/transparent-proxy-config`

  This annotation is automatically applied in environments using [Kuma CNI]({{ docs }}/production/dp-config/cni/#configure-the-kuma-cni) instead of init containers. It contains the final configuration for installing the transparent proxy. Manually modifying or setting this annotation has no effect, regardless of whether Kuma CNI is used. Its primary purpose is to efficiently pass the transparent proxy configuration between Kubernetes workloads and the Kuma CNI, which handles the actual installation of the transparent proxy for those workloads.

- `traffic.kuma.io/transparent-proxy-configmap-name`

  This annotation lets you specify a custom name for the ConfigMap that holds the transparent proxy configuration when the [Configuration in ConfigMap]({{ docs }}/networking/transparent-proxy/kubernetes/#configuration-in-configmap-experimental) feature is enabled. For more details, refer to the [Custom ConfigMap name]({{ docs }}/networking/transparent-proxy/kubernetes/#custom-configmap-name) section.

## Full reference

- **`kumaDPUser`**

  The username or UID of the user that will run `kuma-dp`

  {% capture tip %}
  {% tip %}
  If this value is not provided, the system will default to using the UID `5678` or the username `kuma-dp`
  {% endtip %}
  {% endcapture %}
  {{ tip | indent }}
  
  {% include snippets/tproxy/conf-field-table.html.liquid type="string" flag="--kuma-dp-user" env="KUMA_DP_USER" runtime="sidecarContainer.uid" runtimeEnv="SIDECAR_CONTAINER_UID" %}

  **Examples**

  ```sh
  kumactl install transparent-proxy --kuma-dp-user bob
  ```

  ```sh
  KUMA_TRANSPARENT_PROXY_KUMA_DP_USER="5679" kumactl install transparent-proxy
  ```

- **`ipFamilyMode`**

  The IP family mode used for configuring traffic redirection in the transparent proxy

  {% include snippets/tproxy/conf-field-table.html.liquid type="enum" default="dualstack" values="dualstack,ipv4" flag="--ip-family-mode" env="IP_FAMILY_MODE" annotation="kuma.io/transparent-proxying-ip-family-mode" runtime="sidecarContainer.ipFamilyMode" runtimeEnv="SIDECAR_CONTAINER_IP_FAMILY_MODE" %}

- **`redirect`**

  - **`inbound`**

    - **`enabled`**

      Enables inbound traffic redirection

      {% include snippets/tproxy/conf-field-table.html.liquid type="bool" default="true" flag="--redirect-inbound" env="REDIRECT_INBOUND_ENABLED" %}

    - **`port`**

      Port used for redirecting inbound traffic

      {% include snippets/tproxy/conf-field-table.html.liquid type="Port" default="15006" flag="--redirect-inbound-port" env="REDIRECT_INBOUND_PORT" runtime="sidecarContainer.redirectPortInbound" runtimeEnv="SIDECAR_CONTAINER_REDIRECT_PORT_INBOUND" %}

    - **`includePorts`**

      List of ports to include in inbound traffic redirection

      {% capture warning %}
      {%- warning -%}
      This option cannot be used together with `redirect.inbound.excludePorts`. If both are specified, `redirect.inbound.includePorts` will take precedence
      {%- endwarning -%}
      {% endcapture %}
      {{ warning | indent | indent }}

      {% include snippets/tproxy/conf-field-table.html.liquid type="[]Port" env="REDIRECT_INBOUND_INCLUDE_PORTS" %}

    - **`excludePorts`**

      List of ports to exclude from inbound traffic redirection

      {% capture warning %}
      {%- warning -%}
      This option cannot be used together with `redirect.inbound.includePorts`. If both are specified, `redirect.inbound.includePorts` will take precedence.
      {%- endwarning -%}
      {% endcapture %}
      {{ warning | indent | indent }}

      {% include snippets/tproxy/conf-field-table.html.liquid type="[]Port" flag="--exclude-inbound-ports" env="REDIRECT_INBOUND_EXCLUDE_PORTS" annotation="traffic.kuma.io/exclude-inbound-ports" runtime="sidecarTraffic.excludeInboundPorts" runtimeEnv="SIDECAR_TRAFFIC_EXCLUDE_INBOUND_PORTS" %}

    - **`excludePortsForIPs`**

      List of IP addresses to exclude from inbound traffic redirection for specific ports

      {% include snippets/tproxy/conf-field-table.html.liquid type="[]string" flag="--exclude-inbound-ips" env="REDIRECT_INBOUND_EXCLUDE_PORTS_FOR_IPS" annotation="traffic.kuma.io/exclude-inbound-ips" runtime="sidecarTraffic.excludeInboundIPs" runtimeEnv="SIDECAR_TRAFFIC_EXCLUDE_INBOUND_IPS" format="ip[,...]" %}
 
      This CLI flag can be repeated. For example:
    
      ```sh
      kumactl install transparent-proxy \
        --exclude-outbound-ips "10.0.0.1,172.1.0.0/24" \
        --exclude-outbound-ips "fe80::/10"
      ```

    - **`excludePortsForUIDs`**

      List of UIDs to exclude from inbound traffic redirection for specific ports

      {% include snippets/tproxy/conf-field-table.html.liquid type="[]string" env="REDIRECT_INBOUND_EXCLUDE_PORTS_FOR_UIDS" %}

    - **`insertRedirectInsteadOfAppend`**

      Inserts the redirection rule at the beginning of the chain instead of appending it

      **Details**: For inbound traffic, by default, the last applied iptables rule in the `PREROUTING` chain of the `nat` table redirects traffic to our custom chain (`KUMA_MESH_INBOUND_REDIRECT`) for handling transparent proxying. If there is an existing rule in this chain that redirects traffic to another chain, our default behavior of appending the rule would cause it to be added after the existing one, making our rule ineffective. Specifying this flag changes the behavior to insert the rule at the beginning of the chain, ensuring our rule takes precedence

      {% capture tip %}
      {%- tip -%}
      Note that if the `redirect.vnet` setting is also specified, the default behavior is already to insert the rule, so using this setting will not change that behavior
      {%- endtip -%}
      {% endcapture %}
      {{ tip | indent | indent }}

      {% include snippets/tproxy/conf-field-table.html.liquid type="bool" default="false" flag="--redirect-inbound-insert-instead-of-append" env="REDIRECT_INBOUND_INSERT_REDIRECT_INSTEAD_OF_APPEND" %}

  - **`outbound`**

    - **`enabled`**

      Enables outbound traffic redirection

      {% include snippets/tproxy/conf-field-table.html.liquid type="bool" default="true" env="REDIRECT_OUTBOUND_ENABLED" %}

    - **`port`**

      Port used for redirecting outbound traffic

      {% include snippets/tproxy/conf-field-table.html.liquid type="Port" default="15001" flag="--redirect-outbound-port" env="REDIRECT_OUTBOUND_PORT" runtime="sidecarContainer.redirectPortOutbound" runtimeEnv="SIDECAR_CONTAINER_REDIRECT_PORT_OUTBOUND" %}

    - **`includePorts`**

      List of ports to include in outbound traffic redirection

      {% capture warning %}
      {%- warning -%}
      This option cannot be used together with `redirect.outbound.excludePorts`. If both are specified, `redirect.outbound.includePorts` will take precedence.
      {%- endwarning -%}
      {% endcapture %}
      {{ warning | indent | indent }}

      {% include snippets/tproxy/conf-field-table.html.liquid type="[]Port" env="REDIRECT_OUTBOUND_INCLUDE_PORTS" %}

    - **`excludePorts`**

      List of ports to exclude from outbound traffic redirection

      {% capture warning %}
      {%- warning -%}
      This option cannot be used together with `redirect.outbound.includePorts`. If both are specified, `redirect.outbound.includePorts` will take precedence.
      {%- endwarning -%}
      {% endcapture %}
      {{ warning | indent | indent }}

      {% include snippets/tproxy/conf-field-table.html.liquid type="[]Port" flag="--exclude-outbound-ports" env="REDIRECT_OUTBOUND_EXCLUDE_PORTS" annotation="traffic.kuma.io/exclude-outbound-ports" runtime="sidecarTraffic.excludeOutboundPorts" runtimeEnv="SIDECAR_TRAFFIC_EXCLUDE_OUTBOUND_PORTS" %}

    - **`excludePortsForIPs`**

      List of IP addresses to exclude from outbound traffic redirection for specific ports.

      {% include snippets/tproxy/conf-field-table.html.liquid type="[]string" flag="--exclude-outbound-ips" env="REDIRECT_OUTBOUND_EXCLUDE_PORTS_FOR_IPS" annotation="traffic.kuma.io/exclude-outbound-ips" format="ip[,...]" runtime="sidecarTraffic.excludeOutboundIPs" runtimeEnv="SIDECAR_TRAFFIC_EXCLUDE_OUTBOUND_IPS" %}

    - **`excludePortsForUIDs`**

      List of UIDs to exclude from outbound traffic redirection for specific ports

      {% include snippets/tproxy/conf-field-table.html.liquid type="[]string" flag="--exclude-outbound-ports-for-uids" env="REDIRECT_OUTBOUND_EXCLUDE_PORTS_FOR_UIDS" annotation="traffic.kuma.io/exclude-outbound-ports-for-uids" format="[[protocol:][ports:]uids][;...]" %}

      **Examples**

      - Exclude outbound **TCP** and **UDP** traffic to all ports for processes owned by user with **UID** `1000`:

        ```sh
        kumactl install transparent-proxy \
          --exclude-outbound-ports-for-uids "1000"
        ```

      - Exclude outbound **UDP** traffic to all ports for processes owned by user with **UID** `1000`:

        ```sh
        kumactl install transparent-proxy \
          --exclude-outbound-ports-for-uids "udp:*:1000"
        ```

      - Exclude outbound **TCP** traffic to port `22` and ports `80–88` for processes owned by users with **UIDs** in the range `1000–1002`:

        ```sh
        kumactl install transparent-proxy \
          --exclude-outbound-ports-for-uids "tcp:22,80-88:1000-1002"
        ```

      - Exclude outbound **TCP** and **UDP** traffic to all ports for processes owned by users with **UIDs** in the range `1000–1100`, and exclude outbound **UDP** traffic to all ports for processes owned by user with **UID** `2000`:

        ```sh
        kumactl install transparent-proxy \
          --exclude-outbound-ports-for-uids "1000-1100;udp:*:2000"
        ```

        ```sh
        kumactl install transparent-proxy \
          --exclude-outbound-ports-for-uids "1000-1100" \
          --exclude-outbound-ports-for-uids "udp:*:2000"
        ```

    - **`insertRedirectInsteadOfAppend`**

      Inserts the redirection rule at the beginning of the chain instead of appending it

      **Details**: For outbound traffic, by default, the last applied iptables rule in the `OUTPUT` chain of the `nat` table redirects traffic to our custom chain (`KUMA_MESH_OUTBOUND_REDIRECT`), where it is processed for transparent proxying. However, if there is an existing rule in this chain that already redirects traffic to another chain, our default behavior of appending the rule will cause our rule to be added after the existing one, effectively ignoring it. When this flag is specified, it changes the behavior from appending to inserting the rule at the beginning of the chain, ensuring that our iptables rule takes precedence

      {% include snippets/tproxy/conf-field-table.html.liquid type="bool" default="false" flag="--redirect-outbound-insert-instead-of-append" env="REDIRECT_OUTBOUND_INSERT_REDIRECT_INSTEAD_OF_APPEND" %}

- **`dns`**

  - **`enabled`**

    Enables redirection of DNS queries to the DNS server managed by {{ Kuma }}, listening on the port specified in the `redirect.dns.port` setting

    {% capture tip %}
    {%- tip -%}
    When `redirect.dns.captureAll` is disabled, only queries directed to servers listed in the file specified via `redirect.dns.resolvConfigPath`) will be redirected. If `redirect.dns.captureAll` is enabled, all DNS queries will be redirected, regardless of the target DNS server
    {%- endtip -%}
    {% endcapture %}
    {{ tip | indent | indent }}

    {% include snippets/tproxy/conf-field-table.html.liquid type="bool" default="true" env="REDIRECT_DNS_ENABLED" runtime="builtinDNS.enabled" runtimeEnv="BUILTIN_DNS_ENABLED" %}

  - **`port`**

    The port where the DNS server managed by {{ Kuma }} is listening

    {% include snippets/tproxy/conf-field-table.html.liquid type="Port" default="15053" flag="--redirect-dns-port" env="REDIRECT_DNS_PORT" runtime="builtinDNS.port" runtimeEnv="BUILTIN_DNS_PORT" %}

  - **`captureAll`**

    Redirect all DNS traffic to the DNS server managed by {{ Kuma }}, listening on the port specified in the `redirect.dns.port` setting

    {% capture warning %}
    {%- warning -%}
    This setting requires `redirect.dns.enabled`, which is disabled by default. However, using the `--redirect-all-dns-traffic` flag automatically enables it. Note that combining `--redirect-all-dns-traffic` with `--redirect-dns` is incorrect and will result in an error. In all other cases, ensure `redirect.dns.enabled` is explicitly enabled via the appropriate environment variable or in the `JSON` / `YAML` configuration.
    {%- endwarning -%}
    {% endcapture %}
    {{ warning | indent | indent }}

    {% include snippets/tproxy/conf-field-table.html.liquid type="bool" default="false" flag="--redirect-all-dns-traffic" env="REDIRECT_DNS_CAPTURE_ALL" %}

  - **`skipConntrackZoneSplit`**

    Disables conntrack zone splitting, which can prevent potential DNS issues

    **Details**: The conntrack zone splitting feature is used to avoid DNS resolution errors when applications make numerous DNS UDP requests. Normally, we separate conntrack zones to ensure proper handling of DNS traffic: Zone 2 handles DNS packets between the application and the local proxy, while Zone 1 manages packets between the proxy and upstream DNS resolvers. Disabling this feature should only be done if necessary, for example, in environments where custom iptables rules are already manipulating DNS traffic (for example, inside Docker containers in custom networks when redirecting all DNS traffic \[`redirect.dns.captureAll` is enabled\])

    {% include snippets/tproxy/conf-field-table.html.liquid type="bool" default="false" flag="--skip-dns-conntrack-zone-split" env="REDIRECT_DNS_SKIP_CONNTRACK_ZONE_SPLIT" %}

  - **`resolvConfigPath`**

    Specifies the path to the `resolv.conf` file used to parse the DNS servers for redirecting DNS queries

    {% capture tip %}
    {%- tip -%}
    This setting is taken into account only when `redirect.dns.captureAll` is not enabled.
    {%- endtip -%}
    {% endcapture %}
    {{ tip | indent | indent }}

    {% include snippets/tproxy/conf-field-table.html.liquid type="string" default="/etc/resolv.conf" env="REDIRECT_DNS_RESOLV_CONFIG_PATH" %}

- **`vnet`**

  - **`networks`**

    Specifies virtual networks using the format `interfaceName:CIDR` Allows matching traffic on specific network interfaces

    **Examples**:

    - `docker0:172.17.0.0/16`
    - `br+:172.18.0.0/16` (matches any interface with name starting with `br`)
    - `iface:::1/64` (for IPv6)

    {% include snippets/tproxy/conf-field-table.html.liquid type="[]string" flag="--vnet" env="REDIRECT_VNET_NETWORKS" %}

- **`ebpf`**

  {% capture warning %}
  {%- warning -%}
  eBPF implementation is experimental. Use with caution
  {%- endwarning -%}
  {% endcapture %}
  {{ warning | indent }}

  - **`enabled`**

    Enables eBPF support for handling traffic redirection in the transparent proxy

    {% include snippets/tproxy/conf-field-table.html.liquid type="bool" default="false" flag="--ebpf-enabled" env="EBPF_ENABLED" annotation="kuma.io/transparent-proxying-ebpf" runtime="ebpf.enabled" runtimeEnv="EBPF_ENABLED" %}

  - **`instanceIP`**

    IP address of the instance (pod/vm) where transparent proxy will be installed

    {% capture warning %}
    {%- warning -%}
    Mutually exclusive with `ebpf.instanceIPEnvVarName`.
    {%- endwarning -%}
    {% endcapture %}
    {{ warning | indent | indent }}

    {% include snippets/tproxy/conf-field-table.html.liquid type="string" flag="--ebpf-instance-ip" env="EBPF_INSTANCE_IP" %}

  - **`instanceIPEnvVarName`**

    The name of the environment variable containing the IP address of the instance (pod/vm) where transparent proxy will be installed

    {% capture warning %}
    {%- warning -%}
    Mutually exclusive with `ebpf.instanceIP`.
    {%- endwarning -%}
    {% endcapture %}
    {{ warning | indent | indent }}

    {% include snippets/tproxy/conf-field-table.html.liquid type="string" env="EBPF_INSTANCE_IP_ENV_VAR_NAME" annotation="kuma.io/transparent-proxying-ebpf-instance-ip-env-var-name" runtime="ebpf.instanceIPEnvVarName" runtimeEnv="EBPF_INSTANCE_IP_ENV_VAR_NAME" %}

  - **`bpffsPath`**

    The path of the BPF filesystem

    {% include snippets/tproxy/conf-field-table.html.liquid type="string" default="/run/kuma/bpf" flag="--ebpf-bpffs-path" env="EBPF_BPFFS_PATH" annotation="kuma.io/transparent-proxying-ebpf-bpf-fs-path" runtime="ebpf.bpffsPath" runtimeEnv="EBPF_BPFFS_PATH" %}

  - **`cgroupPath`**

    The path of cgroup2

    {% include snippets/tproxy/conf-field-table.html.liquid type="string" default="/sys/fs/cgroup" flag="--ebpf-cgroup-path" env="EBPF_CGROUP_PATH" annotation="kuma.io/transparent-proxying-ebpf-cgroup-path" runtime="ebpf.cgroupPath" runtimeEnv="EBPF_CGROUP_PATH" %}

  - **`programsSourcePath`**

    Path where compiled eBPF programs and other necessary files for eBPF mode can be found

    {% include snippets/tproxy/conf-field-table.html.liquid type="string" default="/tmp/kuma-ebpf" flag="--ebpf-programs-source-path" env="EBPF_PROGRAMS_SOURCE_PATH" annotation="kuma.io/transparent-proxying-ebpf-programs-source-path" runtime="ebpf.programSourcePath" runtimeEnv="EBPF_PROGRAMS_SOURCE_PATH" %}

  - **`tcAttachIface`**

    The network interface for TC eBPF programs to bind to. If not provided, it will be automatically determined

    {% include snippets/tproxy/conf-field-table.html.liquid type="string" flag="--ebpf-tc-attach-iface" env="EBPF_TC_ATTACH_IFACE" annotation="kuma.io/transparent-proxying-ebpf-tc-attach-iface" runtime="ebpf.tcAttachIface" runtimeEnv="EBPF_TC_ATTACH_IFACE" %}

- **`retry`**

  - **`maxRetries`**

    The maximum number of retry attempts for operations

    {% include snippets/tproxy/conf-field-table.html.liquid type="uint" default="4" flag="--max-retries" env="RETRY_MAX_RETRIES" %}

  - **`sleepBetweenRetries`**

    The time duration to wait between retry attempts

    {% include snippets/tproxy/conf-field-table.html.liquid type="Duration" default="2s" flag="--sleep-between-retries" env="RETRY_SLEEP_BETWEEN_RETRIES" %}

- **`iptablesExecutables`**

  Specifies custom paths for iptables executables

  {% capture warning %}
  {%- warning -%}
  You must provide all three executables for each IP version you want to customize (IPv4 or IPv6), meaning if you configure one for IPv6 (for example, `ip6tables`), you must also specify `ip6tables-save` and `ip6tables-restore`. Partial configurations for either IPv4 or IPv6 are not allowed.
  {%- endwarning -%}
  {% endcapture %}
  {{ warning | indent }}

  {% capture warning %}
  {%- warning -%}
  Provided paths are not extensively validated, so ensure you specify correct paths and that the executables are actual iptables binaries to avoid misconfigurations and unexpected behavior.
  {%- endwarning -%}
  {% endcapture %}
  {{ warning | indent }}

  {% capture tip %}
  {%- tip -%}
  Configuration values can be set through a combination of sources: config file (via `--config` or `--config-file`), environment variables, and the `--iptables-executables` flag. For example, you can specify `ip6tables` in the config file, `ip6tables-save` as an environment variable, and `ip6tables-restore` via the `--iptables-executables` flag.
  {%- endtip -%}
  {% endcapture %}
  {{ tip | indent }}

  {% include snippets/tproxy/conf-field-table.html.liquid type="object" allowedKeys="iptables,iptables-save,iptables-restore,ip6tables,ip6tables-save,ip6tables-restore" flag="--iptables-executables" env="IPTABLES_EXECUTABLES" %}

- **`log`**

  - **`enabled`**

    Determines whether iptables rules logging is activated. When `true`, each packet matching an iptables rule will have its details logged, aiding in diagnostics and monitoring of packet flows

    {% include snippets/tproxy/conf-field-table.html.liquid type="bool" default="false" flag="--iptables-logs" env="LOG_ENABLED" annotation="traffic.kuma.io/iptables-logs" %}

  - **`level`**

    Specifies the log level for iptables logging as defined by netfilter. This level controls the verbosity and detail of the log entries for matching packets. Higher values increase the verbosity. The exact behavior can depend on the system's syslog configuration

    **Available log levels**:

    - `0` - emergency (system is unusable)
    - `1` - alert (action must be taken immediately)
    - `2` - critical (critical conditions)
    - `3` - error (error conditions)
    - `4` - warning (warning conditions)
    - `5` - notice (normal but significant condition)
    - `6` - info (informational)
    - `7` - debug (debug-level messages)

    {% include snippets/tproxy/conf-field-table.html.liquid type="enum" default="7" values="0,1,2,3,4,5,6,7" env="LOG_LEVEL" %}

- **`comments`**

  - **`disabled`**

    Disables the addition of comments to iptables rules

    {% capture warning %}
    {%- warning -%}
    Disabling comments is strongly discouraged, as they are essential for properly uninstalling the transparent proxy. If comments are disabled, the `kumactl uninstall transparent-proxy` command will not function, and you'll need to manually remove the related iptables rules when necessary.
    {%- endwarning -%}
    {% endcapture %}
    {{ warning | indent | indent }}

    {% include snippets/tproxy/conf-field-table.html.liquid type="bool" default="false" flag="--disable-comments" env="COMMENTS_DISABLED" %}

- **`wait`**

  Time in seconds to wait for acquiring the xtables lock before failing. Value `0` means wait indefinitely

  {% include snippets/tproxy/conf-field-table.html.liquid type="uint" default="5" flag="--wait" env="WAIT" %}

- **`waitInterval`**

  Time interval between retries to acquire the xtables lock in seconds

  {% include snippets/tproxy/conf-field-table.html.liquid type="uint" default="0" flag="--wait-interval" env="WAIT_INTERVAL" %}

- **`dropInvalidPackets`**

  Drops invalid packets to avoid connection resets in high-throughput scenarios

  **Details**: This setting enables dropping of packets in invalid states, improving application stability by preventing them from reaching the backend. This is particularly beneficial during high-throughput requests where out-of-order packets might bypass DNAT

  {% capture warning %}
  {%- warning -%}
  Note that enabling this flag may introduce slight performance overhead. Weigh the trade-off between connection stability and performance before enabling it.
  {%- endwarning -%}
  {% endcapture %}
  {{ warning | indent }}

  {% include snippets/tproxy/conf-field-table.html.liquid type="bool" default="false" flag="--drop-invalid-packets" env="DROP_INVALID_PACKETS" annotation="traffic.kuma.io/drop-invalid-packets" %}

- **`storeFirewalld`**

  Enables firewalld support to store iptables rules

  {% include snippets/tproxy/conf-field-table.html.liquid type="bool" default="false" flag="--store-firewalld" env="STORE_FIREWALLD" %}

- **`cniMode`**

  {% include snippets/tproxy/conf-field-table.html.liquid type="bool" default="false" env="CNI_MODE" %}

- **`dryRun`**

  Enables dry-run mode

  {% include snippets/tproxy/conf-field-table.html.liquid type="bool" default="false" flag="--dry-run" env="DRY_RUN" %}

- **`verbose`**

  Enables verbose mode with longer argument/flag names and additional comments

  {% include snippets/tproxy/conf-field-table.html.liquid type="bool" default="false" flag="--verbose" env="VERBOSE" %}
