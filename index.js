const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// Banco de dados temporário na memória do bot
const serverConfig = {
    antilink: false,
    antiraid: false
};

const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Responde Pong!'),
    new SlashCommandBuilder().setName('setupmod').setDescription('Abre o painel de configuração do sistema de segurança'),
    new SlashCommandBuilder().setName('banmod').setDescription('Bane um usuário do servidor').addUserOption(o => o.setName('usuario').setDescription('O usuário a ser banido').setRequired(true)),
    new SlashCommandBuilder().setName('kickmod').setDescription('Expulsa um usuário do servidor').addUserOption(o => o.setName('usuario').setDescription('O usuário a ser expulso').setRequired(true))
];

client.once('ready', async () => {
    console.log(`Bot conectado como ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationGuildCommands('1504950960777068584', '1501445052168278016'), { body: commands });
        console.log('✅ Comandos de segurança sincronizados!');
    } catch (error) {
        console.error(error);
    }
});

// FUNÇÃO DO PAINEL DE CONTROLE (/setupmod)
function gerarPainel() {
    const embed = new EmbedBuilder()
        .setTitle('🛡️ Painel de Segurança - Moderação')
        .setDescription('Configure os sistemas de proteção do seu servidor utilizando os botões abaixo.')
        .setColor('#2f3136')
        .addFields(
            { name: '🔗 Sistema Anti-Link', value: serverConfig.antilink ? '🟢 **ATIVADO**' : '🔴 **DESATIVADO**', inline: true },
            { name: '🚨 Sistema Anti-Raid', value: serverConfig.antiraid ? '🟢 **ATIVADO**' : '🔴 **DESATIVADO**', inline: true }
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
            .setStyle(serverConfig.antiraid ? ButtonStyle.Danger : ButtonStyle.Success)
    );

    return { embeds: [embed], components: [row] };
}

client.on('interactionCreate', async (i) => {
    // Responder aos Comandos Slash
    if (i.isChatInputCommand()) {
        if (i.commandName === 'ping') await i.reply('Pong! 🏓');
        
        if (i.commandName === 'setupmod') {
            await i.reply(gerarPainel());
        }
        
        if (i.commandName === 'banmod') {
            const user = i.options.getUser('usuario');
            try {
                await i.guild.members.ban(user);
                await i.reply(`✅ O usuário ${user.tag} foi banido com sucesso!`);
            } catch {
                await i.reply({ content: '❌ Não consegui banir este usuário. Verifique se meu cargo está acima do dele.', ephemeral: true });
            }
        }
        
        if (i.commandName === 'kickmod') {
            const user = i.options.getUser('usuario');
            try {
                await i.guild.members.kick(user);
                await i.reply(`✅ O usuário ${user.tag} foi expulso com sucesso!`);
            } catch {
                await i.reply({ content: '❌ Não consegui expulsar este usuário. Verifique se meu cargo está acima do dele.', ephemeral: true });
            }
        }
    }

    // Responder aos Cliques nos Botões do Painel
    if (i.isButton()) {
        // Verificar se quem clicou tem permissão de Administrador
        if (!i.member.permissions.has('Administrator')) {
            return i.reply({ content: '❌ Apenas administradores podem mexer no painel!', ephemeral: true });
        }

        if (i.customId === 'toggle_link') serverConfig.antilink = !serverConfig.antilink;
        if (i.customId === 'toggle_raid') serverConfig.antiraid = !serverConfig.antiraid;

        // Atualiza a mensagem com o novo estado (Verde/Vermelho)
        await i.update(gerarPainel());
    }
});

// MONITOR DE MENSAGENS (SISTEMA ANTI-LINK AUTOMÁTICO)
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    if (serverConfig.antilink) {
        // Ignorar se o membro for Administrador para ele poder postar links
        if (message.member.permissions.has('Administrator')) return;

        // Expressão regular que detecta links (http, https, www, .com, discord.gg, etc)
        const regexLink = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(discord\.gg\/[^\s]+)/gi;

        if (regexLink.test(message.content)) {
            try {
                await message.delete();
                const aviso = await message.channel.send(`⚠️ ${message.author}, **links não são permitidos** neste servidor com o Anti-Link ativado!`);
                setTimeout(() => aviso.delete().catch(() => {}), 5000); // Apaga o aviso depois de 5 segundos
            } catch (err) {
                console.error('Erro ao deletar link:', err);
            }
        }
    }
});

// MONITOR DE ENTRADAS (SISTEMA ANTI-RAID AUTOMÁTICO)
client.on('guildMemberAdd', async (member) => {
    if (serverConfig.antiraid) {
        // Conta criada há menos de 5 dias é considerada suspeita em Raid
        const contaNovaMs = 1000 * 60 * 60 * 24 * 5; 
        const idadeConta = Date.now() - member.user.createdTimestamp;

        if (idadeConta < contaNovaMs) {
            try {
                await member.send(`Olá! Você foi expulso do servidor **${member.guild.name}** porque o sistema Anti-Raid está ativado e sua conta é muito recente (menos de 5 dias).`).catch(() => {});
                await member.kick('Anti-Raid Ativado: Conta muito recente');
            } catch (err) {
                console.error('Erro no Anti-Raid ao expulsar:', err);
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
