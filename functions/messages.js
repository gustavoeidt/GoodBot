module.exports = {
    errorMessage: (channel, message, seconds) => {
        channel.send(message).then((sentMessage) => {
            setTimeout(() => {
                sentMessage.delete();
            }, seconds * 1000);
        });
        let errorChannel = channel.guild ? channel.guild.channels.find(c => c.name == "error-logs") : null;
        if (errorChannel) {
            errorChannel.send(channel + ': ' + message);
        }
    },
    send: (channel, message, seconds) => {
        channel.send(message).then((sentMessage) => {
            setTimeout(() => {
                sentMessage.delete();
            }, seconds * 1000);
        });
    },
    handle: async (client, message) => {
        let ignoreBots = null;
        if (message.guild) {
            ignoreBots = await client.guildOption.getCached(client, message.guild.id, 'ignoreBots');
        }
        if (ignoreBots == null || ignoreBots == 1) {
            // Ignore all bots
            if (message.author.bot) return;
        }

        // Our standard argument/command name definition.
        let args = message.content.trim().split(/ +/g);
        let signupSymbol = args[0];
        let signupName = args[1] ? args[1] : '';

        // Allow a user to get the current bot trigger
        if (message.content == '?trigger') {
            return message.channel.send('Current trigger: ' + client.config.prefix);
        }

        if (message.channel && message.channel.name && message.channel.name == 'set-your-name') {
            client.setup.nick(client, message);
        }

        // If a message starts with +, - or m, and we're in a sign-up channel, treat it as a sign-up.
        if (["+", "-", "m"].includes(signupSymbol) && signupSymbol.length == 1) {
            // Check if this is a raid channel
            client.models.raid.findOne({ where: { 'channelID': message.channel.id, 'guildID': message.channel.guild.id } }).then((raid) => {
                if (raid) {
                    if (!signupName) {
                        signupName = message.member.displayName;
                    }

                    if (!signupSymbol) {
                        return false;
                    }

                    client.signups.set(signupSymbol, signupName, message.channel.name, message, client);
                    setTimeout(() => {
                        message.delete().catch(O_o => { });
                    }, 1000);
                }
            });
        }

        // Check if the message starts with our command trigger -- if so, pop off first element and check if it's a command.
        var command = '';
        if (message.content.indexOf(client.config.prefix) == 0) {
            args = message.content.slice(client.config.prefix.length).trim().split(/ +/g);
            command = args.shift().toLowerCase();
        };

        const cmd = client.commands.get(command);

        // If that command doesn't exist, silently exit and do nothing
        if (!cmd) return;

        // Delete the message from the channel after delaying for 1s (prevents 'phantom message' bug)
        setTimeout(() => {
            message.delete().catch(O_o => { });
        }, 1000)

        // Check if user can manage channels
        message.isAdmin = 0;
        if (message.member && message.member.hasPermission("MANAGE_CHANNELS")) {
            message.isAdmin = 1;
        }

        // Check if user is a server admin
        message.serverAdmin = 0;
        if (message.member && message.member.hasPermission("ADMINISTRATOR")) {
            message.serverAdmin = 1;
        }

        member = message.member ? message.member : message.author;

        // Log the command
        client.log.write(client, member, message.channel, 'Command: ' + message.content)

        // Send the client object along with the message
        message.client = client;

        // Run the command
        cmd.run(client, message, args);
    }
}