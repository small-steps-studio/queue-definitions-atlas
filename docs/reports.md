# Reports

Every report reads the text of the active editor and opens its result as a new Markdown document. Your file is never changed and nothing is sent anywhere. The examples below come from the sample file (Open Sample File).

## Show Definitions Summary

Command: **Queue Definitions Atlas: Show Definitions Summary**

Shows the broker version of the export, the number of entries in each section, and for every virtual host the number of queues, exchanges, bindings and policies.

Example (sample file):

> # Definitions Summary
>
> Exported from version 3.13.7.
>
> | Section | Entries |
> | --- | ---: |
> | users | 3 |
> | vhosts | 3 |
> | permissions | 2 |
> | topic_permissions | 0 |
> | parameters | 0 |
> | global_parameters | 0 |
> | policies | 2 |
> | queues | 3 |
> | exchanges | 2 |
> | bindings | 3 |
>
> | Vhost | Queues | Exchanges | Bindings | Policies |
> | --- | ---: | ---: | ---: | ---: |
> | / | 0 | 0 | 0 | 0 |
> | legacy | 0 | 0 | 0 | 0 |
> | shop | 3 | 2 | 3 | 2 |

## Show Queues

Command: **Queue Definitions Atlas: Show Queues**

Lists every queue by virtual host with its type from x-queue-type (classic when not set), whether it is durable and auto-delete, and its arguments such as dead-letter exchange, length limits and TTL.

Example (sample file):

> # Queues
>
> 3 queues: 1 classic, 1 quorum, 1 stream.
>
> | Vhost | Queue | Type | Durable | Auto-delete | Arguments |
> | --- | --- | --- | --- | --- | --- |
> | shop | emails.outbound | stream | yes | no | x-max-age=7D, x-queue-type=stream |
> | shop | orders.audit | classic | no | no | - |
> | shop | orders.created | quorum | yes | no | x-dead-letter-exchange=orders.dlx, x-queue-type=quorum |

## Show Exchanges And Bindings

Command: **Queue Definitions Atlas: Show Exchanges And Bindings**

Lists every exchange with its type, durability, internal flag and the number of bindings that start at it, and every binding with its source, destination, destination kind and routing key.

Example (sample file):

> # Exchanges and Bindings
>
> ## Exchanges
>
> | Vhost | Exchange | Type | Durable | Internal | Bindings |
> | --- | --- | --- | --- | --- | ---: |
> | shop | notifications | fanout | yes | no | 0 |
> | shop | orders | topic | yes | no | 2 |
>
> ## Bindings
>
> | Vhost | Source | Destination | Kind | Routing key |
> | --- | --- | --- | --- | --- |
> | shop | orders | orders.created | queue | order.created |
> | shop | orders | orders.archive | queue | order.\# |
> | shop | billing | emails.outbound | queue | - |

## Show Topology Check (Pro)

Command: **Queue Definitions Atlas: Show Topology Check** (Pro; part of the 14-day trial)

Finds bindings whose source or destination is not defined, queues whose dead-letter exchange does not exist, queues without bindings, transient classic queues, exchanges no binding uses, policies with invalid patterns or patterns that match nothing, and policies that still use classic mirroring, which RabbitMQ 4.0 removed.

Example (sample file):

> # Topology Check
>
> 8 findings.
>
> | Vhost | Object | Check | Finding |
> | --- | --- | --- | --- |
> | shop | binding | missing_destination | binding from orders to queue orders.archive: the queue is not defined |
> | shop | binding | missing_source | binding from billing to emails.outbound: the source exchange is not defined |
> | shop | queue orders.created | missing_dead_letter_exchange | x-dead-letter-exchange orders.dlx is not defined |
> | shop | queue orders.audit | unbound_queue | no binding: messages reach it only through the default exchange \(routing key = queue name\) |
> | shop | queue orders.audit | transient_queue | the queue is not durable and is lost when the broker restarts |
> | shop | exchange notifications | unused_exchange | no binding uses this exchange; messages published to it are dropped |
> | shop | policy ha-orders | classic_mirroring | ha-mode \(classic queue mirroring\) was removed in RabbitMQ 4.0; use quorum queues |
> | shop | policy archive-ttl | policy_matches_nothing | pattern ^archive\\. matches no queue in this export |

## Show Security Review (Pro)

Command: **Queue Definitions Atlas: Show Security Review** (Pro; part of the 14-day trial)

Finds the default guest user, users with the administrator tag, users without a password hash, password hashes made with MD5, non-administrators with configure, write and read permission on everything in a virtual host, and virtual hosts on which no user has permissions.

Example (sample file):

> # Security Review
>
> 6 findings.
>
> | Object | Check | Finding |
> | --- | --- | --- |
> | user guest | guest_user | the default guest user exists; delete it or give it a strong password and no remote access |
> | user guest | administrator | has the administrator tag \(full control of the broker\) |
> | user orders-service | weak_hash | the password hash uses MD5; re-create the user to hash it with SHA-256 |
> | user grafana | no_password | no password hash: the user can only log in with another mechanism, or not at all |
> | user orders-service | full_permissions | configure, write and read .\* on vhost shop: every resource of the vhost |
> | vhost legacy | no_permissions | no user has permissions on this vhost |
