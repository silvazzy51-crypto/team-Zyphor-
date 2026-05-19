const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

// Configurações salvas na memória do bot
const serverConfig = {
    antilink: false,
    antiraid: false,
    adminRoleId: null // Aqui vai ficar o ID do cargo que você escolher pelo /setup
};

const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Responde Pong!'),
    new SlashCommandBuilder().setName('setup').setDescription('Configura o cargo de Administrador do bot').addRoleOption(o => o.setName('cargo').setDescription('O cargo que poderá usar o bot').setRequired(true)),
    new SlashCommandBuilder().setName('painel').setDescription('Abre o painel de configuração do sistema de segurança'),
    new SlashCommandBuilder().setName('banmod').setDescription('Bane um usuário do servidor').addUserOption(o => o.setName('usuario').setDescription('O usuário a ser banido').setRequired(true)),
    new SlashCommandBuilder().setName('kickmod').setDescription('Expulsa um usuário do servidor').addUserOption(o => o.setName('usuario').setDescription('O usuário a ser expulso').setRequired(true))
];

client.once('ready', async () => {
    console.log(`Bot conectado como ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationGuildCommands('1504950960777068584', '1501445052168278016'), { body: commands });
        console.log('✅ Todos os comandos sincronizados com segurança!');
    } catch (error) {
        console.error(error);
    }
});

// Função para verificar se quem usou o comando tem permissão
function temPermissao(member) {
    // Se o dono do servidor usar, ele sempre tem permissão
    if (member.id === member.guild.ownerId) return true;
    
    // Se você já configurou um cargo no /setup, verifica se a pessoa tem esse cargo
    if (serverConfig.adminRoleId && member.roles.cache.has(serverConfig.adminRoleId)) return true;
    
    // Caso contrário, apenas quem tem a permissão nativa de Administrador do Discord pode usar
    return member.permissions.has('Administrator');
}

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
    if (i.isChatInputCommand()) {
        if (i.commandName === 'ping') return await i.reply('Pong! 🏓');

        // Bloqueia qualquer outro comando se a pessoa não for Admin cadastrado
        if (!temPermissao(i.member)) {
            return await i.reply({ content: '❌ Você não tem permissão para usar os comandos deste bot!', ephemeral: true });
        }

        // COMANDO /SETUP (Define o cargo de Admin)
        if (i.commandName === 'setup') {
            const cargo = i.options.getRole('cargo');
            serverConfig.adminRoleId = cargo.id;
            return await i.reply(`✅ Sucesso! Agora apenas membros com o cargo **${cargo.name}** (e o Dono) podem gerenciar este bot.`);
        }
        
        if (i.commandName === 'painel') {
            return await i.reply(gerarPainel());
        }
        
        if (i.commandName === 'banmod') {
            const user = i.options.getUser('usuario');
            try {
                await i.guild.members.ban(user);
                await i.reply(`✅ O usuário ${user.tag} foi banido com sucesso!`);
            } catch {
                await i.reply({ content: '❌ Erro ao banir. Verifique se meu cargo está acima do dele.', ephemeral: true });
            }
        }
        
        if (i.commandName === 'kickmod') {
            const user = i.options.getUser('usuario');
            try {
                await i.guild.members.kick(user);
                await i.reply(`✅ O usuário ${user.tag} foi expulso com sucesso!`);
            } catch {
                await i.reply({ content: '❌ Erro ao expulsar. Verifique se meu cargo está acima do dele.', ephemeral: true });
            }
        }
    }

    if (i.isButton()) {
        // Bloqueia os botões para quem não é Admin cadastrado
        if (!temPermissao(i.member)) {
            return i.reply({ content: '❌ Você não tem permissão para usar esses botões!', ephemeral: true });
        }

        if (i.customId === 'toggle_link') serverConfig.antilink = !serverConfig.antilink;
        if (i.customId === 'toggle_raid') serverConfig.antiraid = !serverConfig.antiraid;

        await i.update(gerarPainel());
    }
});

// ANTI-LINK
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    if (serverConfig.antilink) {
        if (temPermissao(message.member)) return; // Admins cadastrados podem enviar links
        const regexLink = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(discord\.gg\/[^\s]+)/gi;
        if (regexLink.test(message.content)) {
            try {
                await message.delete();
                const aviso = await message.channel.send(`⚠️ ${message.author}, links não são permitidos aqui!`);
                setTimeout(() => aviso.delete().catch(() => {}), 5000);
            } catch (err) {
                console.error(err);
            }
        }
    }
});

// ANTI-RAID
client.on('guildMemberAdd', async (member) => {
    if (serverConfig.antiraid) {
        const contaNovaMs = 1000 * 60 * 60 * 24 * 5; 
        const idadeConta = Date.now() - member.user.createdTimestamp;
        if (idadeConta < contaNovaMs) {
            try {
                await member.send(`Você foi expulso de **${member.guild.name}** pelo Anti-Raid (Conta com menos de 5 dias).`).catch(() => {});
                await member.kick('Anti-Raid: Conta muito recente');
            } catch (err) {
                console.error(err);
            }
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
