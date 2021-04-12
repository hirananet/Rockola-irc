nest build
docker build -t docker.pkg.github.com/hirananet/rockola-irc/service .
docker push docker.pkg.github.com/hirananet/rockola-irc/service
ssh -p 7639 alex@empireo.hirana.net "docker pull docker.pkg.github.com/hirananet/rockola-irc/service" | \
ssh -p 7639 alex@empireo.hirana.net "docker rm -f rockola" | \
ssh -p 7639 alex@empireo.hirana.net "docker run --restart unless-stopped -d -p 3091:3001 -p 3090:3000 --name rockola docker.pkg.github.com/hirananet/rockola-irc/service" | \
ssh -p 7639 alex@empireo.hirana.net "docker logs -f rockola"