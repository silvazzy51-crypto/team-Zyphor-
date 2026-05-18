const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ] 
});

// Configuração na memória do bot
const configServidor = {
    antiLink: false,
    antiSpam: false,
    antiRaid: false,
    adms: [] // Lista para IDs de administradores extras
};

// Mapa para o Anti-Spam temporário
const msgDoUsuario = new Map();

client.once('ready', () => {
    console.log(`📱 Bot online com sucesso como ${client.user.tag}!`);
});

// ====== COMANDO !setup (PAINEL DE CONFIGURAÇÃO) ======
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // Comando para abrir o painel
    if (message.content === '!setup') {
        // Verifica se quem digitou é Admin do servidor ou está na lista de adms do bot
        const donoOuAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator) || configServidor.adms.includes(message.author.id);
        
        if (!donoOuAdmin) {
            return message.reply("❌ Apenas administradores do servidor podem usar este painel.");
        }

        const embed = new EmbedBuilder()
            .setTitle('🛡️ Painel de Segurança do Servidor')
            .setDescription(`Ative ou desative as funções de proteção clicando no menu abaixo:\n\n` +
                            `🔗 **Anti-Link:** ${configServidor.antiLink ? '🟢 LIGADO' : '🔴 DESLIGADO'}\n` +
                            `⚠️ **Anti-Spam:** ${configServidor.antiSpam ? '🟢 LIGADO' : '🔴 DESLIGADO'}\n` +
                            `🔨 **Anti-Raid:** ${configServidor.antiRaid ? '🟢 LIGADO' : '🔴 DESLIGADO'}`)
            .setColor('#2b2d31')
            .setFooter({ text: 'Use com responsabilidade • Diário Liderança' });

        const menu = new StringSelectMenuBuilder()
            .setCustomId('painel_seguranca')
            .setPlaceholder('Escolha o que deseja alterar...')
            .addOptions([
                { label: 'Ligar/Desligar Anti-Link', value: 'toggle_link', description: 'Bloqueia links e convites de outros servidores.' },
                { label: 'Ligar/Desligar Anti-Spam', value: 'toggle_spam', description: 'Dá castigo em quem floda mensagens repetidas.' },
                { label: 'Ligar/Desligar Anti-Raid', value: 'toggle_raid', description: 'Expulsa contas muito novas (fakes) que entrarem.' }
            ]);

        const row = new ActionRowBuilder().addComponents(menu);

        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

// ====== LEITOR DE CLIQUES NO MENU DO PAINEL ======
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId !== 'painel_seguranca') return;

    // Segurança: só admins podem clicar
    const donoOuAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) || configServidor.adms.includes(interaction.user.id);
    if (!donoOuAdmin) {
        return interaction.reply({ content: "❌ Você não tem permissão para alterar as configurações do bot.", ephemeral: true });
    }

    const escolha = interaction.values[0];

    // Altera o estado (Se tava falso vira verdadeiro, se tava verdadeiro vira falso)
    if (escolha === 'toggle_link') configServidor.antiLink = !configServidor.antiLink;
    if (escolha === 'toggle_spam') configServidor.antiSpam = !configServidor.antiSpam;
    if (escolha === 'toggle_raid') configServidor.antiRaid = !configServidor.antiRaid;

    // Cria o embed atualizado para mostrar na tela
    const embedAtualizado = new EmbedBuilder()
        .setTitle('🛡️ Painel de Segurança do Servidor')
        .setDescription(`Configurações atualizadas com sucesso:\n\n` +
                        `🔗 **Anti-Link:** ${configServidor.antiLink ? '🟢 LIGADO' : '🔴 DESLIGADO'}\n` +
                        `⚠️ **Anti-Spam:** ${configServidor.antiSpam ? '🟢 LIGADO' : '🔴 DESLIGADO'}\n` +
                        `🔨 **Anti-Raid:** ${configServidor.antiRaid ? '🟢 LIGADO' : '🔴 DESLIGADO'}`)
        .setColor('#2b2d31')
        .setFooter({ text: 'Use com responsabilidade • Diário Liderança' });

    await interaction.update({ embeds: [embedAtualizado] });
});

// ====== SISTEMAS DE DEFESA AUTOMÁTICA ======

// 1. Defesa de Chat (Anti-Link e Anti-Spam)
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    
    // Admins do servidor e do bot burlam as proteções para poderem trabalhar normalmente
    const eAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator) || configServidor.adms.includes(message.author.id);
    if (eAdmin) return;

    // Ação do Anti-Link
    if (configServidor.antiLink) {
        if (message.content.includes('discord.gg/') || message.content.includes('http://') || message.content.includes('https://')) {
            await message.delete().catch(() => {});
            return message.channel.send(`⚠️ ${message.author}, links não são permitidos neste servidor!`)
                .then(msg => setTimeout(() => msg.delete().catch(() => {}), 4000));
        }
    }

    // Ação do Anti-Spam
    if (configServidor.antiSpam) {
        const userId = message.author.id;
        if (msgDoUsuario.has(userId)) {
            const dados = msgDoUsuario.get(userId);
            if (dados.texto === message.content) {
                dados.qtd += 1;
                
                if (dados.qtd >= 4) { // Se o cara digitar a MESMA coisa 4 vezes seguidas...
                    await message.delete().catch(() => {});
                    // Aplica Castigo (Timeout) de 5 minutos (300.000 milissegundos)
                    await message.member.timeout(300000, 'Fazer Spam/Flood no chat').catch(() => {});
                    return message.channel.send(`🚨 ${message.author} tomou um castigo de 5 minutos por fazer Spam.`);
                }
            } else {
                dados.texto = message.content;
                dados.qtd = 1;
            }
            msgDoUsuario.set(userId, dados);
        } else {
            msgDoUsuario.set(userId, { texto: message.content, qtd: 1 });
        }
    }
});

// 2. Defesa de Entrada (Anti-Raid)
client.on('guildMemberAdd', async (member) => {
    if (!configServidor.antiRaid) return;

    // Calcula a idade da conta em dias
    const diasDeCriacao = (Date.now() - member.user.createdAt) / (1000 * 60 * 60 * 24);

    // Se a conta tiver menos de 2 dias de criada, o bot expulsa (防 Raid de conta fake recém-criada)
    if (diasDeCriacao < 2) {
        await member.send(`⚠️ Você foi expulso de **${member.guild.name}** porque sua conta é muito recente (Proteção Anti-Raid ativada).`).catch(() => {});
        await member.kick('Anti-Raid: Conta com menos de 48 horas de criação.').catch(() => {});
    }
});

// Puxa o Token direto das variáveis de ambiente da Railway
client.login(process.env.DISCORD_TOKEN);
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField } = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ] 
});

// Configuração na memória do bot
const configServidor = {
    antiLink: false,
    antiSpam: false,
    antiRaid: false,
    adms: [] // Lista para IDs de administradores extras
};

// Mapa para o Anti-Spam temporário
const msgDoUsuario = new Map();

client.once('ready', () => {
    console.log(`📱 Bot online com sucesso como ${client.user.tag}!`);
});

// ====== COMANDO !setup (PAINEL DE CONFIGURAÇÃO) ======
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    // Comando para abrir o painel
    if (message.content === '!setup') {
        // Verifica se quem digitou é Admin do servidor ou está na lista de adms do bot
        const donoOuAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator) || configServidor.adms.includes(message.author.id);
        
        if (!donoOuAdmin) {
            return message.reply("❌ Apenas administradores do servidor podem usar este painel.");
        }

        const embed = new EmbedBuilder()
            .setTitle('🛡️ Painel de Segurança do Servidor')
            .setDescription(`Ative ou desative as funções de proteção clicando no menu abaixo:\n\n` +
                            `🔗 **Anti-Link:** ${configServidor.antiLink ? '🟢 LIGADO' : '🔴 DESLIGADO'}\n` +
                            `⚠️ **Anti-Spam:** ${configServidor.antiSpam ? '🟢 LIGADO' : '🔴 DESLIGADO'}\n` +
                            `🔨 **Anti-Raid:** ${configServidor.antiRaid ? '🟢 LIGADO' : '🔴 DESLIGADO'}`)
            .setColor('#2b2d31')
            .setFooter({ text: 'Use com responsabilidade • Diário Liderança' });

        const menu = new StringSelectMenuBuilder()
            .setCustomId('painel_seguranca')
            .setPlaceholder('Escolha o que deseja alterar...')
            .addOptions([
                { label: 'Ligar/Desligar Anti-Link', value: 'toggle_link', description: 'Bloqueia links e convites de outros servidores.' },
                { label: 'Ligar/Desligar Anti-Spam', value: 'toggle_spam', description: 'Dá castigo em quem floda mensagens repetidas.' },
                { label: 'Ligar/Desligar Anti-Raid', value: 'toggle_raid', description: 'Expulsa contas muito novas (fakes) que entrarem.' }
            ]);

        const row = new ActionRowBuilder().addComponents(menu);

        await message.channel.send({ embeds: [embed], components: [row] });
    }
});

// ====== LEITOR DE CLIQUES NO MENU DO PAINEL ======
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId !== 'painel_seguranca') return;

    // Segurança: só admins podem clicar
    const donoOuAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator) || configServidor.adms.includes(interaction.user.id);
    if (!donoOuAdmin) {
        return interaction.reply({ content: "❌ Você não tem permissão para alterar as configurações do bot.", ephemeral: true });
    }

    const escolha = interaction.values[0];

    // Altera o estado (Se tava falso vira verdadeiro, se tava verdadeiro vira falso)
    if (escolha === 'toggle_link') configServidor.antiLink = !configServidor.antiLink;
    if (escolha === 'toggle_spam') configServidor.antiSpam = !configServidor.antiSpam;
    if (escolha === 'toggle_raid') configServidor.antiRaid = !configServidor.antiRaid;

    // Cria o embed atualizado para mostrar na tela
    const embedAtualizado = new EmbedBuilder()
        .setTitle('🛡️ Painel de Segurança do Servidor')
        .setDescription(`Configurações atualizadas com sucesso:\n\n` +
                        `🔗 **Anti-Link:** ${configServidor.antiLink ? '🟢 LIGADO' : '🔴 DESLIGADO'}\n` +
                        `⚠️ **Anti-Spam:** ${configServidor.antiSpam ? '🟢 LIGADO' : '🔴 DESLIGADO'}\n` +
                        `🔨 **Anti-Raid:** ${configServidor.antiRaid ? '🟢 LIGADO' : '🔴 DESLIGADO'}`)
        .setColor('#2b2d31')
        .setFooter({ text: 'Use com responsabilidade • Diário Liderança' });

    await interaction.update({ embeds: [embedAtualizado] });
});

// ====== SISTEMAS DE DEFESA AUTOMÁTICA ======

// 1. Defesa de Chat (Anti-Link e Anti-Spam)
client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    
    // Admins do servidor e do bot burlam as proteções para poderem trabalhar normalmente
    const eAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator) || configServidor.adms.includes(message.author.id);
    if (eAdmin) return;

    // Ação do Anti-Link
    if (configServidor.antiLink) {
        if (message.content.includes('discord.gg/') || message.content.includes('http://') || message.content.includes('https://')) {
            await message.delete().catch(() => {});
            return message.channel.send(`⚠️ ${message.author}, links não são permitidos neste servidor!`)
                .then(msg => setTimeout(() => msg.delete().catch(() => {}), 4000));
        }
    }

    // Ação do Anti-Spam
    if (configServidor.antiSpam) {
        const userId = message.author.id;
        if (msgDoUsuario.has(userId)) {
            const dados = msgDoUsuario.get(userId);
            if (dados.texto === message.content) {
                dados.qtd += 1;
                
                if (dados.qtd >= 4) { // Se o cara digitar a MESMA coisa 4 vezes seguidas...
                    await message.delete().catch(() => {});
                    // Aplica Castigo (Timeout) de 5 minutos (300.000 milissegundos)
                    await message.member.timeout(300000, 'Fazer Spam/Flood no chat').catch(() => {});
                    return message.channel.send(`🚨 ${message.author} tomou um castigo de 5 minutos por fazer Spam.`);
                }
            } else {
                dados.texto = message.content;
                dados.qtd = 1;
            }
            msgDoUsuario.set(userId, dados);
        } else {
            msgDoUsuario.set(userId, { texto: message.content, qtd: 1 });
        }
    }
});

// 2. Defesa de Entrada (Anti-Raid)
client.on('guildMemberAdd', async (member) => {
    if (!configServidor.antiRaid) return;

    // Calcula a idade da conta em dias
    const diasDeCriacao = (Date.now() - member.user.createdAt) / (1000 * 60 * 60 * 24);

    // Se a conta tiver menos de 2 dias de criada, o bot expulsa (防 Raid de conta fake recém-criada)
    if (diasDeCriacao < 2) {
        await member.send(`⚠️ Você foi expulso de **${member.guild.name}** porque sua conta é muito recente (Proteção Anti-Raid ativada).`).catch(() => {});
        await member.kick('Anti-Raid: Conta com menos de 48 horas de criação.').catch(() => {});
    }
});

// Puxa o Token direto das variáveis de ambiente da Railway
client.login(process.env.DISCORD_TOKEN);
