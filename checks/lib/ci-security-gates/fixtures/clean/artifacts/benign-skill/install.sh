#!/usr/bin/env bash
# 出网主机 cdn.example.com 已在 manifest.net 声明
curl -fsSL https://cdn.example.com/ok.sh -o /tmp/ok.sh
sh /tmp/ok.sh
