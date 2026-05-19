const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionsBitField } = require('discord.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// Configurações salvas na memória do bot
const serverConfig = {
    antilink: false,
    antiraid: false,
    antispam: false,
    modoSilencioso: false,
    adminRoles: []
};

// Guardar histórico de mensagens para o Anti-Spam
const mapaSpam = new Map();

const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Responde Pong!'),
    new SlashCommandBuilder().setName('setup').setDescription('Adiciona ou remove um cargo da lista de administradores do bot')
        .addRoleOption(o => o.setName('cargo').setDescription('O cargo a ser adicionado ou removido').setRequired(true)),
    new SlashCommandBuilder().setName('embed').setDescription('Cria uma mensagem embed personalizada')
        .addStringOption(o => o.setName('titulo').setDescription('Título do embed').setRequired(true))
        .addStringOption(o => o.setName('descricao').setDescription('Descrição do embed').setRequired(true))
        .addStringOption(o => o.setName('foto').setDescription('Link URL da imagem/foto (Opcional)').setRequired(false)),
    new SlashCommandBuilder().setName('painel').setDescription('Abre o painel de configuração do sistema de segurança'),
    new SlashCommandBuilder().setName('stop').setDescription('Ativa o filtro: apaga todas as mensagens comuns enviadas no servidor'),
    new SlashCommandBuilder().setName('start').setDescription('Desativa o filtro de mensagens e libera o chat'),
    new SlashCommandBuilder().setName('banmod').setDescription('Bane um usuário do servidor')
        .addUserOption(o => o.setName('usuario').setDescription('O usuário a ser banido').setRequired(true)),
    new SlashCommandBuilder().setName('kickmod').setDescription('Expulsa um usuário do servidor')
        .addUserOption(o => o.setName('usuario').setDescription('O usuário a ser expulso').setRequired(true))
];

client.once('ready', async () => {
    console.log(`✅ Bot conectado com sucesso como ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationGuildCommands('1504950960777068584', '1501445052168278016'), { body: commands });
        console.log('✅ Todos os comandos sincronizados com o Discord!');
    } catch (error) {
        console.error('❌ Erro ao sincronizar comandos:', error);
    }
});

function temPermissao(member) {
    if (!member) return false;
    if (member.id === member.guild.ownerId) return true;
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    if (serverConfig.adminRoles.some(roleId => member.roles.cache.has(roleId))) return true;
    return false;
}

function gerarPainel() {
    const embed = new EmbedBuilder()
        .setTitle('🛡️ Painel de Segurança - Moderação')
        .setDescription('Configure os sistemas de proteção do seu servidor utilizando os botões abaixo.')
        .setColor('#2f3136')
        .addFields(
            { name: '🔗 Sistema Anti-Link', value: serverConfig.antilink ? '🟢 **ATIVADO**' : '🔴 **DESATIVADO**', inline: true },
            { name: '🚨 Sistema Anti-Raid', value: serverConfig.antiraid ? '🟢 **ATIVADO**' : '🔴 **DESATIVADO**', inline: true },
            { name: '💬 Sistema Anti-Spam', value: serverConfig.antispam ? '🟢 **ATIVADO**' : '🔴 **DESATIVADO**', inline: true }
        )
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('toggle_link').setLabel(serverConfig.antilink ? 'Desativar Anti-Link' : 'Ativar Anti-Link').setStyle(serverConfig.antilink ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('toggle_raid').setLabel(serverConfig.antiraid ? 'Desativar Anti-Raid' : 'Ativar Anti-Raid').setStyle(serverConfig.antiraid ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('toggle_spam').setLabel(serverConfig.antispam ? 'Desativar Anti-Spam' : 'Ativar Anti-Spam').setStyle(serverConfig.antispam ? ButtonStyle.Danger : ButtonStyle.Success)
    );

    return { embeds: [embed], components: [row] };
}

client.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand()) {
        if (i.commandName === 'ping') return await i.reply('Pong! 🏓');

        if (!temPermissao(i.member)) {
            return await i.reply({ content: '❌ Você não tem permissão para usar os comandos deste bot!', ephemeral: true });
        }

        await i.deferReply().catch(() => {});

        if (i.commandName === 'setup') {
            const cargo = i.options.getRole('cargo');
            if (serverConfig.adminRoles.includes(cargo.id)) {
                serverConfig.adminRoles = serverConfig.adminRoles.filter(id => id !== cargo.id);
                return await i.editReply(`❌ O cargo **${cargo.name}** foi **removido** da lista de admins do bot.`);
            } else {
                serverConfig.adminRoles.push(cargo.id);
                return await i.editReply(`✅ O cargo **${cargo.name}** foi **adicionado** à lista de admins do bot!`);
            }
        }
        
        if (i.commandName === 'embed') {
            const titulo = i.options.getString('titulo');
            const desc = i.options.getString('descricao');
            const fotoUrl = i.options.getString('foto');

            const embed = new EmbedBuilder().setTitle(titulo).setDescription(desc).setColor('Blue').setTimestamp();

            if (fotoUrl) {
                if (fotoUrl.startsWith('http://') || fotoUrl.startsWith('https://')) {
                    embed.setImage(fotoUrl);
                } else {
                    return await i.editReply('❌ O link da foto precisa começar com `http://` ou `https://`!');
                }
            }
            return await i.editReply({ embeds: [embed] });
        }
        
        if (i.commandName === 'painel') return await i.editReply(gerarPainel());

        if (i.commandName === 'stop') {
            serverConfig.modoSilencioso = true;
            return await i.editReply('🚫 **Modo Silencioso ATIVADO!** Mensagens de membros comuns serão apagadas.');
        }

        if (i.commandName === 'start') {
            serverConfig.modoSilencioso = false;
            return await i.editReply('✅ **Modo Silencioso DESATIVADO!** O chat foi liberado.');
        }
        
        if (i.commandName === 'banmod') {
            const user = i.options.getUser('usuario');
            try { await i.guild.members.ban(user); await i.editReply(`✅ O usuário ${user.tag} foi banido!`); } catch { await i.editReply('❌ Erro ao banir.'); }
        }
        
        if (i.commandName === 'kickmod') {
            const user = i.options.getUser('usuario');
            try { await i.guild.members.kick(user); await i.editReply(`✅ O usuário ${user.tag} foi expulso!`); } catch { await i.editReply('❌ Erro ao expulso.'); }
        }
    }

    if (i.isButton()) {
        if (!temPermissao(i.member)) return i.reply({ content: '❌ Você não tem permissão!', ephemeral: true });
        if (i.customId === 'toggle_link') serverConfig.antilink = !serverConfig.antilink;
        if (i.customId === 'toggle_raid') serverConfig.antiraid = !serverConfig.antiraid;
        if (i.customId === 'toggle_spam') serverConfig.antispam = !serverConfig.antispam;
        await i.update(gerarPainel());
    }
});

// MONITOR DE MENSAGENS
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    if (temPermissao(message.member)) return; 

    if (serverConfig.modoSilencioso) {
        try { await message.delete(); return; } catch (err) { console.error(err); }
    }

    if (serverConfig.antilink) {
        const regexLink = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(discord\.gg\/[^\s]+)/gi;
        if (regexLink.test(message.content)) {
            try {
                await message.delete();
                const avisoLink = await message.channel.send(`⚠️ ${message.author}, links não são permitidos aqui!`);
                setTimeout(() => avisoLink.delete().catch(() => {}), 5000);
                return;
            } catch (err) { console.error(err); }
        }
    }

    if (serverConfig.antispam) {
        const usuarioId = message.author.id;
        const tempoAtual = Date.now();
        if (!mapaSpam.has(usuarioId)) mapaSpam.set(usuarioId, []);
        const historico = mapaSpam.get(usuarioId);
        historico.push(tempoAtual);
        const mensagensRecentes = historico.filter(tempo => tempoAtual - tempo < 3000);
        mapaSpam.set(usuarioId, mensagensRecentes);
        
        if (mensagensRecentes.length > 4) {
            try {
                await message.delete();
                const membro = await message.guild.members.fetch(usuarioId);
                await membro.timeout(60000, 'Anti-Spam Ativado');
                const avisoSpam = await message.channel.send(`🚨 ${message.author} levou timeout de 1 minuto por Spam!`);
                setTimeout(() => avisoSpam.delete().catch(() => {}), 5000);
            } catch (err) { console.error(err); }
        }
    }
});

client.on('guildMemberAdd', async (member) => {
    if (serverConfig.antiraid) {
        const contaNovaMs = 1000 * 60 * 60 * 24 * 5; 
        const idadeConta = Date.now() - member.user.createdTimestamp;
        if (idadeConta < contaNovaMs) {
            try { await member.kick('Anti-Raid: Conta muito recente'); } catch (err) { console.error(err); }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
