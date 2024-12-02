---
title: Transparent Proxy on Universal
content_type: how-to
---

{% assign docs = "/docs/" | append: page.release %}
{% assign Kuma = site.mesh_product_name %}
{% assign tproxy = site.data.tproxy %}

{% capture Warning %}{% if page.edition and page.edition != "kuma" %}**Warning:** {% endif %}{% endcapture %}
{% capture Important %}{% if page.edition and page.edition != "kuma" %}**Important:** {% endif %}{% endcapture %}
{% capture Note %}{% if page.edition and page.edition != "kuma" %}**Note:** {% endif %}{% endcapture %}
{% capture brbr %}{% if page.edition and page.edition != "kuma" %}<br /><br />{% endif %}{% endcapture %}

Using the transparent proxy in Universal mode makes setup easier and enables features that wouldn’t be possible otherwise. Key benefits include:

- **Simplified `Dataplane` resources**: You can skip the `networking.outbound` section, so you don’t have to list each service your application connects to manually.

- **Simplified service connectivity**: Take advantage of [Kuma DNS]({{ docs }}/networking/dns/) to use `.mesh` domain names, like `https://service-1.mesh`, for easy service connections without needing `localhost` and ports in the `Dataplane` resource.

- **Flexible service naming**: With [MeshServices]({{ docs }}/networking/meshservice/) and [HostnameGenerators]({{ docs }}/networking/hostnamegenerator/), you can:

  - Keep your existing DNS names when moving to the service mesh.
  - Give a service multiple DNS names for easier access.
  - Set up custom routes, like targeting specific StatefulSet Pods or service versions.
  - Expose a service on multiple ports for different uses.

- **Simpler security, tracing, and observability**: Transparent proxy makes managing these features easier, with no extra setup required.

## Installation


## Upgrading

The core `iptables` rules applied by {{ Kuma }}'s transparent proxy rarely change, but occasionally new features may require updates. To upgrade the transparent proxy on Universal environments, follow these steps:

### Step 1: Cleanup existing iptables rules (conditional)

{% warning %}
{{ Important }}If you're upgrading from {{ Kuma }} version 2.9 or later, and you have **not** manually disabled the automatic addition of comments by setting `comments.disabled` to `true` in the transparent proxy configuration, **this step is unnecessary**.
{{ brbr }}
Starting with {{ Kuma }} 2.9, all `iptables` rules are tagged with comments, allowing {{ Kuma }} to track rule ownership. This enables `kumactl` to automatically clean up any existing `iptables` rules or custom chains created by previous versions of the transparent proxy. This process runs automatically at the start of the installation, eliminating the need for any manual cleanup beforehand.
{% endwarning %}

To manually remove existing `iptables` rules, you can either restart the host (if the rules were not persisted using system start-up scripts or `firewalld`), or run the following commands:

{% danger %}
{{ Warning }}These commands will remove **all** `iptables` rules and **all** custom chains in the specified tables, including those created by {{ Kuma }} as well as any other applications or services.
{% enddanger %}

```sh
iptables --table nat --flush         # Flush all rules in the nat table (IPv4)
ip6tables --table nat --flush        # Flush all rules in the nat table (IPv6)
iptables --table nat --delete-chain  # Delete all custom chains in the nat table (IPv4)
ip6tables --table nat --delete-chain # Delete all custom chains in the nat table (IPv6)

# The raw table contains rules for DNS traffic redirection
iptables --table raw --flush         # Flush all rules in the raw table (IPv4)
ip6tables --table raw --flush        # Flush all rules in the raw table (IPv6)

# The mangle table contains rules to drop invalid packets
iptables --table mangle --flush      # Flush all rules in the mangle table (IPv4)
ip6tables --table mangle --flush     # Flush all rules in the mangle table (IPv6)
```

### Step 2: Install new transparent proxy

After clearing the `iptables` rules (if necessary), reinstall the transparent proxy by running:

```sh
kumactl install transparent-proxy [...]
```

This command will install the new version of the transparent proxy with the specified configuration. Adjust the flags as needed to suit your environment.

## Configuration

The default configuration works well for most scenarios, but there are cases where adjustments are needed.

{{ Kuma }} uses a unified configuration structure for transparent proxy across all components. For a detailed breakdown of this structure, including examples, expected formats, and variations between configuration methods, refer to the [Transparent Proxy Configuration reference]({{ docs }}/reference/transparent-proxy-configuration/).

In Universal mode, {{ Kuma }} there are three methods to adjust the configuration. Each can be used on its own or combined with others if needed.

{% warning %}
{{ Important }}It’s best to stick to one method whenever possible. Using more than one can make things more complicated and harder to troubleshoot, as it may not be clear where each setting comes from. If you need to combine methods, check the [**Order of Precedence**](#order-of-precedence) section to see what the final configuration will look like based on the priority of each setting.
{% endwarning %}

<!-- vale Google.Headings = NO -->
### YAML / JSON
<!-- vale Google.Headings = YES -->

You can provide the configuration in either `YAML` or `JSON` format by using the `--config` or `--config-file` flags.

{% tip %}
{{ Note }}For the configuration schema in YAML format, refer to the [Schema]({{ docs }}/reference/transparent-proxy-configuration/#schema) section in the [Transparent Proxy Configuration Reference]({{ docs }}/reference/transparent-proxy-configuration/).
{% endtip %}

{% tip %}
{{ Note }}For simplicity, the following examples use YAML format, but you can easily convert them to JSON if preferred. Both formats work exactly the same, so feel free to choose the one that best suits your needs.
{% endtip %}

Below are examples of using these flags in different ways:

1. **Providing configuration via the `--config-file` flag**

   Assume you have a `config.yaml` file with the following content:

   ```yaml
   kumaDPUser: dataplane
   verbose: true
   ```

   You can install the transparent proxy using:

   ```sh
   kumactl install transparent-proxy --config-file config.yaml
   ```

2. **Passing configuration directly via the `--config` flag**

   To pass the configuration content directly:

   ```sh
   kumactl install transparent-proxy --config "kumaDPUser: dataplane\nverbose: true"
   ```

   Alternatively:

   ```sh
   kumactl install transparent-proxy --config "{ kumaDPUser: dataplane, verbose: true }"
   ```

   Both formats are valid YAML inputs.

3. **Passing configuration via [STDIN](https://en.wikipedia.org/wiki/Standard_streams#Standard_input_(stdin))**

   If you need to pass the configuration via STDIN, set `--config-file` to `-` as shown below:

   ```sh
   echo "
   kumaDPUser: dataplane
   verbose: true
   " | kumactl install transparent-proxy --config-file -
   ```

<!-- vale Google.Headings = NO -->
### Environment Variables
<!-- vale Google.Headings = YES -->

You can customize configuration settings by using environment variables. For example:

```sh
KUMA_TRANSPARENT_PROXY_IP_FAMILY_MODE="ipv4" kumactl install transparent-proxy
```

{% tip %}
{{ Note }}To see all available environment variables, visit the [Environment Variables]({{ docs }}/reference/transparent-proxy-configuration/#environment-variables) section in the [Transparent Proxy Configuration Reference]({{ docs }}/reference/transparent-proxy-configuration/).
{% endtip %}

<!-- vale Google.Headings = NO -->
### CLI Flags
<!-- vale Google.Headings = YES -->

Most configuration values can also be specified directly through CLI flags. For example:

```sh
kumactl install transparent-proxy --kuma-dp-user dataplane --verbose
```

{% warning %}
{{ Important }}The following settings cannot be modified directly via CLI flags (corresponding flags are not available):

- `redirect.dns.resolvConfigPath`
- `redirect.inbound.includePorts`
- `redirect.inbound.excludePortsForUIDs`
- `redirect.outbound.enabled`
- `redirect.outbound.includePorts`
- `ebpf.instanceIPEnvVarName`
- `log.level`
- `cniMode`
{% endwarning %}

{% tip %}
{{ Note }}To see all available CLI flags, visit the [CLI Flags]({{ docs }}/reference/transparent-proxy-configuration/#cli-flags) section in the [Transparent Proxy Configuration Reference]({{ docs }}/reference/transparent-proxy-configuration/).
{% endtip %}

<!-- vale Google.Headings = NO -->
### Order of Precedence
<!-- vale Google.Headings = YES -->

1. **Default Values**
2. **Values from** `--config` / `--config-file` **flags**
3. **Environment Variables**
4. **CLI Flags**

To understand how the order of precedence works, consider this scenario:

1. You have a `config.yaml` file with the following content:

   ```yaml
   redirect:
     dns:
       port: 10001
   ```

2. You install the transparent proxy using this command:

   ```sh
   KUMA_TRANSPARENT_PROXY_REDIRECT_DNS_PORT="10002" \
     kumactl install transparent-proxy \
       --config-file config.yaml \
       --redirect-dns-port 10003
   ```

3. In this situation, the possible values for `redirect.dns.port` are:

   - **`{{ tproxy.defaults.redirect.dns.port }}`** (Default Value)
   - **`10001`** (From Config File)
   - **`10002`** (From Environment Variable)
   - **`10003`** (From CLI Flag)

4. Since CLI flags have the highest precedence, the final value for `redirect.dns.port` will be **`10003`**.

## firewalld support

The changes made by running `kumactl install transparent-proxy` **will not persist** after a reboot. To ensure persistence, you can either add this command to your system's start-up scripts or leverage `firewalld` for managing `iptables`.

If you prefer using `firewalld`, you can include the `--store-firewalld` flag when installing the transparent proxy. This will store the `iptables` rules in `/etc/firewalld/direct.xml`, ensuring they persist across system reboots. Here's an example:

```sh
kumactl install transparent-proxy --redirect-dns --store-firewalld
```

{% warning %}
**Important:** Currently, there is no uninstall command for this feature. If needed, you will have to manually clean up the `firewalld` configuration.
{% endwarning %}