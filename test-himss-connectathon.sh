#!/bin/bash

export NODE_EXTRA_CA_CERTS="./gazellecert.pem"
output=$(node dist/manual.js)
echo $output