const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionsBitField } = require('discord.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// Configurações salvas na memória do bot
const serverConfig = {
    antilink: false,
    antiraid: false,
    antispam: false,
    modoSilencioso: false, // Controla o comando /stop e /start
    adminRoleId: null
};

// Guardar histórico de mensagens para o Anti-Spam
const mapaSpam = new Map();

const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Responde Pong!'),
    new SlashCommandBuilder().setName('setup').setDescription('Configura o cargo de Administrador do bot').addRoleOption(o => o.setName('cargo').setDescription('O cargo que poderá usar o bot').setRequired(true)),
    new SlashCommandBuilder().setName('painel').setDescription('Abre o painel de configuração do sistema de segurança'),
    new SlashCommandBuilder().setName('stop').setDescription('Ativa o filtro: apaga todas as mensagens comuns enviadas no servidor'),
    new SlashCommandBuilder().setName('start').setDescription('Desativa o filtro de mensagens e libera o chat'),
    new SlashCommandBuilder().setName('banmod').setDescription('Bane um usuário do servidor').addUserOption(o => o.setName('usuario').setDescription('O usuário a ser banido').setRequired(true)),
    new SlashCommandBuilder().setName('kickmod').setDescription('Expulsa um usuário do servidor').addUserOption(o => o.setName('usuario').setDescription('O usuário a ser expulso').setRequired(true))
];

client.once('ready', async () => {
    console.log(`Bot conectado como ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationGuildCommands('1504950960777068584', '1501445052168278016'), { body: commands });
        console.log('✅ Todos os comandos sincronizados com sucesso!');
    } catch (error) {
        console.error(error);
    }
});

// Função para verificar se o usuário é Admin (Dono, Cargo Setup ou Permissão Nativa)
function temPermissao(member) {
    if (member.id === member.guild.ownerId) return true;
    if (serverConfig.adminRoleId && member.roles.cache.has(serverConfig.adminRoleId)) return true;
    return member.permissions.has(PermissionsBitField.Flags.Administrator);
}

// Gera o Painel de Segurança Bonito (Embed)
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
        new ButtonBuilder()
            .setCustomId('toggle_link')
            .setLabel(serverConfig.antilink ? 'Desativar Anti-Link' : 'Ativar Anti-Link')
            .setStyle(serverConfig.antilink ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('toggle_raid')
            .setLabel(serverConfig.antiraid ? 'Desativar Anti-Raid' : 'Ativar Anti-Raid')
            .setStyle(serverConfig.antiraid ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder()
            .setCustomId('toggle_spam')
            .setLabel(serverConfig.antispam ? 'Desativar Anti-Spam' : 'Ativar Anti-Spam')
            .setStyle(serverConfig.antispam ? ButtonStyle.Danger : ButtonStyle.Success)
    );

    return { embeds: [embed], components: [row] };
}

client.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand()) {
        if (i.commandName === 'ping') return await i.reply('Pong! 🏓');

        // Bloqueia comandos caso o usuário não tenha permissão
        if (!temPermissao(i.member)) {
            return await i.reply({ content: '❌ Você não tem permissão para usar os comandos deste bot!', ephemeral: true });
        }

        // COMANDO /SETUP
        if (i.commandName === 'setup') {
            const cargo = i.options.getRole('cargo');
            serverConfig.adminRoleId = cargo.id;
            return await i.reply(`✅ Sucesso! Agora membros com o cargo **${cargo.name}** podem gerenciar este bot.`);
        }
        
        // COMANDO /PAINEL
        if (i.commandName === 'painel') {
            return await i.reply(gerarPainel());
        }

        // COMANDO /STOP (Modo Silencioso)
        if (i.commandName === 'stop') {
            serverConfig.modoSilencioso = true;
            return await i.reply('🚫 **Modo Silencioso ATIVADO!** Todas as próximas mensagens de membros comuns serão apagadas imediatamente.');
        }

        // COMANDO /START (Desativar Modo Silencioso)
        if (i.commandName === 'start') {
            serverConfig.modoSilencioso = false;
            return await i.reply('✅ **Modo Silencioso DESATIVADO!** O chat foi liberado para todos conversarem.');
        }
        
        // COMANDO /BANMOD
        if (i.commandName === 'banmod') {
            const user = i.options.getUser('usuario');
            try {
                await i.guild.members.ban(user);
                await i.reply(`✅ O usuário ${user.tag} foi banido com sucesso!`);
            } catch {
                await i.reply({ content: '❌ Erro ao banir. Verifique a hierarquia de cargos.', ephemeral: true });
            }
        }
        
        // COMANDO /KICKMOD
        if (i.commandName === 'kickmod') {
            const user = i.options.getUser('usuario');
            try {
                await i.guild.members.kick(user);
                await i.reply(`✅ O usuário ${user.tag} foi expulso com sucesso!`);
            } catch {
                await i.reply({ content: '❌ Erro ao expulsar. Verifique a hierarquia de cargos.', ephemeral: true });
            }
        }
    }

    // Interações com os botões do /painel
    if (i.isButton()) {
        if (!temPermissao(i.member)) {
            return i.reply({ content: '❌ Você não tem permissão para alterar as configurações!', ephemeral: true });
        }

        if (i.customId === 'toggle_link') serverConfig.antilink = !serverConfig.antilink;
        if (i.customId === 'toggle_raid') serverConfig.antiraid = !serverConfig.antiraid;
        if (i.customId === 'toggle_spam') serverConfig.antispam = !serverConfig.antispam;

        await i.update(gerarPainel());
    }
});

// MONITOR DE MENSAGENS (Filtros: Modo Silencioso, Anti-Link e Anti-Spam)
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    if (temPermissao(message.member)) return; // Ignora Admins para que eles possam testar/falar livremente

    // 1. FILTRO DO MODO SILENCIOSO (/stop) - Apaga tudo!
    if (serverConfig.modoSilencioso) {
        try {
            await message.delete();
            const avisoSilencioso = await message.channel.send(`⚠️ ${message.author}, o chat está temporariamente fechado no Modo Silencioso.`);
            setTimeout(() => avisoSilencioso.delete().catch(() => {}), 4000);
            return; // Se o modo silencioso apagou, não precisa rodar os outros filtros abaixo
        } catch (err) {
            console.error('Erro no modo silencioso:', err);
        }
    }

    // 2. SISTEMA ANTI-LINK
    if (serverConfig.antilink) {
        const regexLink = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(discord\.gg\/[^\s]+)/gi;
        if (regexLink.test(message.content)) {
            try {
                await message.delete();
                const avisoLink = await message.channel.send(`⚠️ ${message.author}, **links não são permitidos** aqui!`);
                setTimeout(() => avisoLink.delete().catch(() => {}), 5000);
                return;
            } catch (err) {
                console.error(err);
            }
        }
    }

    // 3. SISTEMA ANTI-SPAM (Máximo de 5 mensagens em 3 segundos)
    if (serverConfig.antispam) {
        const usuarioId = message.author.id;
        const tempoAtual = Date.now();
        
        if (!mapaSpam.has(usuarioId)) mapaSpam.set(usuarioId, []);
        
        const historico = mapaSpam.get(usuarioId);
        historico.push(tempoAtual);
        
        const mensagensRecentes = historico.filter(tempo => tempoAtual - tempo < 3000);
        mapaSpam.set(usuarioId, mensagensRecentes);
        
        if (mensagensRecentes.length > 5) {
            try {
                await message.delete();
                
                // Aplica Castigo de 1 minuto (Mute por Timeout)
                const membro = await message.guild.members.fetch(usuarioId);
                await membro.timeout(60000, 'Anti-Spam Ativado');
                
                const avisoSpam = await message.channel.send(`🚨 ${message.author} recebeu mute de 1 minuto por fazer **Spam**!`);
                setTimeout(() => avisoSpam.delete().catch(() => {}), 6000);
            } catch (err) {
                console.error('Erro no Anti-Spam:', err);
            }
        }
    }
});

// MONITOR DE ENTRADAS (SISTEMA ANTI-RAID)
client.on('guildMemberAdd', async (member) => {
    if (serverConfig.antiraid) {
        const contaNovaMs = 1000 * 60 * 60 * 24 * 5; 
        const idadeConta = Date.now() - member.user.createdTimestamp;

        if (idadeConta < contaNovaMs) {
            try {
                await member.send(`Você foi expulso do servidor **${member.guild.name}** porque o Anti-Raid está ligado e sua conta é muito nova.`).catch(() => {});
                await member.kick('Anti-Raid: Conta com menos de 5 dias');
            } catch (err) {
                console.error(err);
            }
        }
    }
});


client.login(process.env.DISCORD_TOKEN);
