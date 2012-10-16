#!/bin/bash -xe
# This script is executed automatically when the server is first started.
# You can also manually upload this script to a server to prebuild your images.
# Prebuilding your images is probably a better idea since they servers will take
# less time to startup than if you have to install all this stuff everytime.
# You will need to make sure you create an image for every region you are going to use
# User: root.

# Sample: add ssh public keys from your https://launchpad.net account.
# See https://launchpad.net/~<your account name>/+editsshkeys 
#sudo -Hu ubuntu ssh-import-id <your account name>
# Or you can do that manually, writing to /home/ubuntu/.ssh/authorized_keys

# Tune TCP kernel settings. The values didnt help much, but just in case.
#cat >> /etc/sysctl.conf <<"EOF"
#net.ipv4.tcp_mem  = 10000   15000  30000
#net.ipv4.tcp_wmem = 1024    1024   65536
#net.ipv4.tcp_rmem = 1024    1024   65536
#EOF
#sysctl -p

# You might need to up the limits on open file descriptors
# To do this edit /etc/security/limits.conf
# Add the following 2 lines at the bottom
# *                soft    nofile          32000
# *                hard    nofile          32000

# Install latest stable node.js
# add-apt-repository ppa:chris-lea/node.js
# apt-get update
# apt-get install -y nodejs npm git-core build-essential checkinstall

# Checkout the client project from github
# git clone https://github.com/npr/ec2-fleet-client /home/ubuntu/client
cd /home/ubuntu/client
# Update just in case this is an image with client already installed
git pull
npm install
npm update
chown -R ubuntu:ubuntu /home/ubuntu/client /home/ubuntu/tmp /home/ubuntu/.npm

# Install Siege
# After installing siege run siege.config to build a default config file in
# $HOME/.siegerc
# Uncomment below if you are creating a new server
# cd /home/ubuntu
# wget http://www.joedog.org/pub/siege/siege-2.72.tar.gz
# tar -zxvf siege-latest.tar.gz
# cd /home/ubuntu/siege-2.72
# ./configure
# make
# make install

# Write Upstart job.
# cat > /etc/init/client.conf <<"EOF"
#    start on runlevel [2345]

#    respawn
#    respawn limit 10 5 # max 10 times within 5 seconds

#    setuid ubuntu
#    chdir /home/ubuntu/client
#    limit nofile 100000 100000

#    exec node server.js
#EOF

# The upstart job will launch our client and keep it alive.
# Output is written to /var/log/upstart/client.log
# mkdir /var/log/upstart
# initctl reload-configuration
restart client
