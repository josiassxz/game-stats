const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const dbConfig = {
  server: process.env.SQL_SERVER_HOST,
  user: process.env.SQL_SERVER_USER,
  password: process.env.SQL_SERVER_PASSWORD,
  database: process.env.SQL_SERVER_DATABASE,
  options: {
    encrypt: process.env.SQL_SERVER_ENCRYPT === 'true',
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool;

// CORS mais agressivo - antes de qualquer middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE,PATCH');
  res.header('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Origin, Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers, Authorization, Cache-Control, Pragma');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Range');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(cors({
  origin: function (origin, callback) {
    // Permite qualquer origem
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control', 'Pragma'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware adicional para garantir CORS em todas as rotas
app.use('*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE,PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE,PATCH');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.sendStatus(200);
});

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Combat Arms Brasil Server API',
      version: '1.0.0',
      description: 'API para estatísticas do jogo Combat Arms Brasil Server',
      contact: {
        name: 'Support',
        email: 'support@brasilserver.com'
      }
    },
    servers: [
      {
        url: 'https://game-stats-e908.onrender.com',
        description: 'Production server'
      },
      {
        url: `http://localhost:${port}`,
        description: 'Local development server'
      },
      {
        url: `http://apibrasilserver.com:${port}/api-docs/`,
        description: 'Local development server'
      }
    ],
    tags: [
      {
        name: 'Users',
        description: 'Operações relacionadas aos jogadores'
      },
      {
        name: 'Inventory',
        description: 'Operações relacionadas ao inventário dos jogadores'
      },
      {
        name: 'Clans',
        description: 'Operações relacionadas aos clãs'
      },
      {
        name: 'Rankings',
        description: 'Rankings e estatísticas'
      },
      {
        name: 'System',
        description: 'Endpoints do sistema'
      }
    ]
  },
  apis: ['./server.js'],
};

const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Combat Arms Brasil API"
}));

async function initializeDatabase() {
  try {
    pool = await sql.connect(dbConfig);
    console.log('✅ Conectado ao SQL Server');
  } catch (error) {
    console.error('❌ Erro ao conectar no SQL Server:', error.message);
    process.exit(1);
  }
}

async function executeQuery(query, params = {}) {
  try {
    const request = pool.request();
    
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }
    
    const result = await request.query(query);
    return result.recordset;
  } catch (error) {
    throw new Error(`Database error: ${error.message}`);
  }
}

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         oiduser:
 *           type: integer
 *         NickName:
 *           type: string
 *         EXP:
 *           type: integer
 *         strDiscordID:
 *           type: string
 *     Clan:
 *       type: object
 *       properties:
 *         oidGuild:
 *           type: integer
 *         nm_clan:
 *           type: string
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Busca perfis de jogadores por Discord ID, oidUser ou nickname
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: discordid
 *         schema:
 *           type: string
 *         description: Discord ID do jogador
 *       - in: query
 *         name: oidUser
 *         schema:
 *           type: string
 *         description: ID único do usuário (oidUser)
 *       - in: query
 *         name: nickname
 *         schema:
 *           type: string
 *         description: Nickname do jogador (busca parcial)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Tamanho da página
 *     responses:
 *       200:
 *         description: Perfil do jogador
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
app.get('/api/users', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  try {
    const { discordid, oidUser, nickname, page = 1, size = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(size);
    
    let query = `
      SELECT
          a.strDiscordID, a.strNexonID, u.oiduser, u.NickName, f.NationEmblem AS nr_MarcaBatalha,
          u.UsedNX, nx.NXGradeName, u.NickNameColor, u.ColorEndDate, u.SuperRoomMaster, u.AgreeCnt,
          u.DisagreeCnt, u.KickedCnt, u.EXP, r.GradeName, u.Money, u.PlayRoundCnt, u.WinCnt,
          u.LoseCnt, u.Forfeited, u.KillCnt, u.Assist, u.HeadshotCnt, u.DeadCnt, i.NutShotCnt,
          i.NutShotDeadCnt, u.FirstKill, u.DoubleKillCnt, u.MultiKillCnt, u.UltraKillCnt,
          u.FantasticKillCnt, u.UnbelievableCnt, u.UnbelievablePlusCnt, u.RevengeCnt,
          u.KillsStreak, u.MostKills, u.BombsPlanted, u.BombsExploded, u.BombsDefused, u.CaptureFlag, u.RecoverFlag,
          g.oidGuild ClanID, g.strName ClanName, c.Background as BackGroundClan, c.Emblem as EmblemaClan, c.namecolor as NameColorClan, c.ColorEndDate as ColorEndDateClan, u.ClanWin as ClanWinGeral, u.ClanDraw as ClanDrawGeral, u.ClanLose as ClanLoseGeral, u.ClanKill as ClanKillGeral, u.ClanDead as ClanDeadGeral,
          ci.WinCnt as WinCntClanAtual, ci.LoseCnt as LoseCntClanAtual, ci.DrawCnt as DrawCntClanAtual, ci.KillCnt as KillCntClanAtual, ci.DeadCnt as DeadCntClanAtual, ci.ClanForfeited as ClanForfeitedClanAtual,
          i.SpyKillCnt AS SpyHunt_KillCnt, i.SpyDeadCnt AS SpyHunt_DeadCnt, i.SpyUploading AS SpyHunt_Uploading,
          i.HQPoint, i.SQPoint, i.SaveBullionNum, i.HumanKillCnt AS QRT_KillCnt, i.HumanDeathCnt AS QRT_DeathCnt,
          i.HumanWin AS QRT_HumanWin, i.InfectKillCnt AS QRT_InfectKillCnt, i.InfectDeathCnt AS QRT_InfectDeathCnt,
          i.InfectWin AS QRT_InfectWin, i.QuaRanTinePlayNum AS QRT_PlayNum
      FROM
          COMBATARMS.dbo.CBT_User u
      LEFT JOIN
          COMBATARMS.dbo.CBT_GradeInfo r ON u.Exp BETWEEN r.MinExp AND r.MaxExp
      LEFT JOIN
          COMBATARMS.dbo.CBT_UserAuth a ON u.oidUser = a.oidUser
      LEFT JOIN
          COMBATARMS.dbo.CBT_UserDetailInfo i ON u.oidUser = i.oidUser
      LEFT JOIN
          COMBATARMS.dbo.CBT_NXGradeInfo nx ON u.UsedNX BETWEEN nx.MinNX AND nx.MaxNX
      LEFT JOIN
          COMBATARMS.dbo.CBT_UserFakeMark f ON u.oidUser = f.oidUser
      LEFT JOIN 
          NX_GuildMaster.dbo.gdt_Member m ON m.oidUser = u.oidUser
      LEFT JOIN 
          NX_GuildMaster.dbo.gdt_Guild g ON g.oidGuild = m.oidGuild
      LEFT JOIN 
          COMBATARMS.dbo.CBT_ClanInfo c ON c.oiduser_group = g.oidGuild
      LEFT JOIN 
          COMBATARMS.dbo.CBT_UserClanInfo ci ON ci.oiduserclan = g.oidGuild and ci.oiduser = u.oidUser
          
      WHERE 1=1
    `;

    let params = { offset, size: parseInt(size) };
    
    if (discordid) {
      query += ` AND a.strDiscordID = @discordid`;
      params.discordid = discordid;
    }
    
    if (oidUser) {
      query += ` AND u.oidUser = @oidUser`;
      params.oidUser = oidUser;
    }
    
    if (nickname) {
      query += ` AND u.NickName LIKE @nickname`;
      params.nickname = `%${nickname}%`;
    }
    
    query += ` ORDER BY u.EXP DESC`;
    query += ` OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`;

    const results = await executeQuery(query, params);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/inventory:
 *   get:
 *     summary: Busca inventário por Discord ID
 *     tags: [Inventory]
 *     parameters:
 *       - in: query
 *         name: discordid
 *         schema:
 *           type: string
 *         description: Discord ID do jogador
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Tamanho da página
 *     responses:
 *       200:
 *         description: Inventário do jogador
 */
app.get('/api/inventory', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  try {
    const { discordid, page = 1, size = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(size);
    
    let query = `
      SELECT
          a.strDiscordID, a.strNexonID, e.oidUser, u.NickName,
          it.ItemNo AS Nr_Slot_Assault, it.Name AS Slot_Assault,
          it1.ItemNo AS Nr_Slot_SubGun, it1.Name AS Slot_SubGun,
          it2.ItemNo AS Nr_Slot_Knife, it2.Name AS Slot_Knife,
          it3.ItemNo AS Nr_Slot_Bomb, it3.Name AS Slot_Bomb,
          it4.ItemNo AS Nr_Slot_Helmet, it4.Name AS Slot_Helmet,
          it5.ItemNo AS Nr_Slot_Face, it5.Name AS Slot_Face,
          it6.ItemNo AS Nr_Slot_Goggle, it6.Name AS Slot_Goggle,
          it7.ItemNo AS Nr_Slot_Camo, it7.Name AS Slot_Camo,
          it8.ItemNo AS Nr_Slot_Vest, it8.Name AS Slot_Vest,
          it9.ItemNo AS Nr_Slot_BackPackItem, it9.Name AS Slot_BackPackItem,
          it10.ItemNo AS Nr_Slot_BackPack00, it10.Name AS Slot_BackPack00,
          it11.ItemNo AS Nr_Slot_BackPack01, it11.Name AS Slot_BackPack01,
          it12.ItemNo AS Nr_Slot_BackPack02, it12.Name AS Slot_BackPack02,
          it13.ItemNo AS Nr_Slot_BackPack03, it13.Name AS Slot_BackPack03
      FROM
          COMBATARMS.dbo.CBT_UserEquipItems e
      LEFT JOIN
          COMBATARMS.dbo.CBT_User u ON e.oidUser = u.oidUser
      LEFT JOIN
          COMBATARMS.dbo.CBT_UserAuth a ON e.oidUser = a.oidUser
      LEFT JOIN COMBATARMS.dbo.CBT_ItemInfo it ON e.AssultItemNo = it.ItemNo
      LEFT JOIN COMBATARMS.dbo.CBT_ItemInfo it1 ON e.SubGunItemNo = it1.ItemNo
      LEFT JOIN COMBATARMS.dbo.CBT_ItemInfo it2 ON e.KnifeItemNo = it2.ItemNo
      LEFT JOIN COMBATARMS.dbo.CBT_ItemInfo it3 ON e.BombItemNo = it3.ItemNo
      LEFT JOIN COMBATARMS.dbo.CBT_ItemInfo it4 ON e.HelmetItemNo = it4.ItemNo
      LEFT JOIN COMBATARMS.dbo.CBT_ItemInfo it5 ON e.FaceItemNo = it5.ItemNo
      LEFT JOIN COMBATARMS.dbo.CBT_ItemInfo it6 ON e.GoggleItemNo = it6.ItemNo
      LEFT JOIN COMBATARMS.dbo.CBT_ItemInfo it7 ON e.CamoItemNo = it7.ItemNo
      LEFT JOIN COMBATARMS.dbo.CBT_ItemInfo it8 ON e.VestItemNo = it8.ItemNo
      LEFT JOIN COMBATARMS.dbo.CBT_ItemInfo it9 ON e.BackPackItemNo = it9.ItemNo
      LEFT JOIN COMBATARMS.dbo.CBT_ItemInfo it10 ON e.BackPack00 = it10.ItemNo
      LEFT JOIN COMBATARMS.dbo.CBT_ItemInfo it11 ON e.BackPack01 = it11.ItemNo
      LEFT JOIN COMBATARMS.dbo.CBT_ItemInfo it12 ON e.BackPack02 = it12.ItemNo
      LEFT JOIN COMBATARMS.dbo.CBT_ItemInfo it13 ON e.BackPack03 = it13.ItemNo
      WHERE 1=1
    `;

    let params = { offset, size: parseInt(size) };
    if (discordid) {
      query += ` AND a.strDiscordID = @discordid`;
      params.discordid = discordid;
    }
    
    query += ` ORDER BY e.oidUser`;
    query += ` OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`;

    const results = await executeQuery(query, params);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/clans:
 *   get:
 *     summary: Lista clãs do servidor
 *     tags: [Clans]
 *     parameters:
 *       - in: query
 *         name: clanname
 *         schema:
 *           type: string
 *         description: Nome do clã
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Tamanho da página
 *     responses:
 *       200:
 *         description: Lista de clãs
 */
app.get('/api/clans', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  try {
    const { clanname, page = 1, size = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(size);
    
    let query = `
      SELECT
          a.strDiscordID AS DiscordID_Lider,
          a.oidUser AS oidUser_Lider,
          cu.NickName AS Lider,
          gg.oidGuild,
          gg.strName AS nm_clan,
          c.Point,
          c.Exp,
          (SELECT COUNT(DISTINCT oidUser) FROM NX_GuildMaster.dbo.gdt_Member WHERE oidGuild = gg.oidGuild) AS qt_membros,
          c.Emblem,
          c.Background,
          c.NameColor,
          c.ColorEndDate,
          c.TDMWinCnt AS ElimWinCnt,
          c.TDMLoseCnt AS ElimLoseCnt,
          CASE 
              WHEN (c.TDMWinCnt + c.TDMLoseCnt) > 0 
              THEN (CAST(c.TDMWinCnt AS FLOAT) / (c.TDMWinCnt + c.TDMLoseCnt)) * 100 
              ELSE 0 
          END AS ElimWinRate,
          c.TMMWinCnt AS SNDWinCnt,
          c.TMMLoseCnt AS SNDLoseCnt,
          CASE 
              WHEN (c.TMMWinCnt + c.TMMLoseCnt) > 0 
              THEN (CAST(c.TMMWinCnt AS FLOAT) / (c.TMMWinCnt + c.TMMLoseCnt)) * 100 
              ELSE 0 
          END AS SNDWinRate,
          c.TSVWinCnt AS ElimProWinCnt,
          c.TSVLoseCnt AS ElimProLoseCnt,
          CASE 
              WHEN (c.TSVWinCnt + c.TSVLoseCnt) > 0 
              THEN (CAST(c.TSVWinCnt AS FLOAT) / (c.TSVWinCnt + c.TSVLoseCnt)) * 100 
              ELSE 0 
          END AS ElimProWinRate,
          c.CTFWinCnt,
          c.CTFLoseCnt,
          CASE 
              WHEN (c.CTFWinCnt + c.CTFLoseCnt) > 0 
              THEN (CAST(c.CTFWinCnt AS FLOAT) / (c.CTFWinCnt + c.CTFLoseCnt)) * 100 
              ELSE 0 
          END AS CTFWinRate,
          c.CaptureFlagCnt,
          c.ForfeitedCnt
      FROM
          NX_GuildMaster.dbo.gdt_Guild gg
      LEFT JOIN COMBATARMS.dbo.CBT_ClanInfo c ON gg.oidGuild = c.oiduser_group
      LEFT JOIN COMBATARMS.dbo.CBT_User cu ON gg.oidUser_master = cu.oidUser
      LEFT JOIN COMBATARMS.dbo.CBT_UserAuth a ON cu.oidUser = a.oidUser
      WHERE 1=1
    `;

    let params = { offset, size: parseInt(size) };
    if (clanname) {
      query += ` AND gg.strName = @clanname`;
      params.clanname = clanname;
    }
    
    query += ` ORDER BY c.Exp DESC, c.Point DESC`;
    query += ` OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`;

    const results = await executeQuery(query, params);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/clanmembers:
 *   get:
 *     summary: Membros de um clã por nome
 *     tags: [Clans]
 *     parameters:
 *       - in: query
 *         name: clanname
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome do clã
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Tamanho da página
 *     responses:
 *       200:
 *         description: Lista de membros
 */
app.get('/api/clanmembers', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  try {
    const { clanname, page = 1, size = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(size);

    if (!clanname) {
      return res.status(400).json({ error: "O parâmetro 'clanname' é obrigatório." });
    }

    const query = `
      SELECT
          m.oidGuild,
          g.strName AS NomeClan,
          a.strDiscordID,
          a.strNexonID,
          m.oidUser,
          m.dn_strCharacterName AS Nickname,
          CASE
              WHEN m.CodeMemberType = 1 THEN 1
              WHEN m.CodeMemberType = 2 AND m.CodeMemberGroup = 1 THEN 2
              ELSE 3
          END AS cd_cargo,
          CASE
              WHEN m.CodeMemberType = 1 THEN 'Líder'
              WHEN m.CodeMemberType = 2 AND m.CodeMemberGroup = 1 THEN 'Administrador'
              ELSE 'Membro'
          END AS cargo,
          m.dateCreated AS DataEntrada
      FROM
          NX_GuildMaster.dbo.gdt_Member m
      LEFT JOIN
          NX_GuildMaster.dbo.gdt_Guild g ON g.oidGuild = m.oidGuild
      LEFT JOIN
          COMBATARMS.dbo.CBT_UserAuth a ON a.oidUser = m.oidUser
      WHERE
          g.strName = @clanname
      ORDER BY
          cd_cargo, m.dateCreated
      OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY
    `;

    const results = await executeQuery(query, { clanname, offset, size: parseInt(size) });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/ranking:
 *   get:
 *     summary: Rankings dos jogadores
 *     tags: [Rankings]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [exp, kills, wins, money, headshots]
 *         description: Tipo de ranking
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Limite de resultados (deprecated, use page e size)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Tamanho da página
 *     responses:
 *       200:
 *         description: Lista de jogadores
 */
app.get('/api/ranking', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  try {
    const { type = 'exp', limit = 50, page = 1, size = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(size);
    const pageSize = size ? parseInt(size) : parseInt(limit);
    
    let orderBy = 'u.EXP';
    switch(type.toLowerCase()) {
      case 'kills':
        orderBy = 'u.KillCnt';
        break;
      case 'wins':
        orderBy = 'u.WinCnt';
        break;
      case 'money':
        orderBy = 'u.Money';
        break;
      case 'headshots':
        orderBy = 'u.HeadshotCnt';
        break;
      default:
        orderBy = 'u.EXP';
    }

    const query = `
      SELECT
          u.oiduser, u.NickName, u.EXP, r.GradeName, u.Money, u.PlayRoundCnt, 
          u.WinCnt, u.LoseCnt, u.KillCnt, u.DeadCnt, u.HeadshotCnt,
          CASE 
              WHEN u.DeadCnt > 0 THEN ROUND(CAST(u.KillCnt AS FLOAT) / u.DeadCnt, 2) 
              ELSE u.KillCnt 
          END AS KDRatio,
          CASE 
              WHEN u.PlayRoundCnt > 0 THEN ROUND((CAST(u.WinCnt AS FLOAT) / u.PlayRoundCnt) * 100, 2) 
              ELSE 0 
          END AS WinRate
      FROM
          COMBATARMS.dbo.CBT_User u
      LEFT JOIN
          COMBATARMS.dbo.CBT_GradeInfo r ON u.Exp BETWEEN r.MinExp AND r.MaxExp
      WHERE u.NickName IS NOT NULL AND u.NickName != ''
      ORDER BY ${orderBy} DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `;

    const results = await executeQuery(query, { offset, pageSize });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/stats:
 *   get:
 *     summary: Estatísticas gerais
 *     tags: [Rankings]
 *     responses:
 *       200:
 *         description: Estatísticas do servidor
 */
app.get('/api/stats', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  try {
    const queries = {
      totalPlayers: `SELECT COUNT(*) as total FROM COMBATARMS.dbo.CBT_User WHERE NickName IS NOT NULL`,
      totalClans: `SELECT COUNT(*) as total FROM NX_GuildMaster.dbo.gdt_Guild`,
      totalMatches: `SELECT SUM(PlayRoundCnt) as total FROM COMBATARMS.dbo.CBT_User`,
      avgLevel: `SELECT AVG(CAST(EXP AS FLOAT)) as average FROM COMBATARMS.dbo.CBT_User WHERE EXP > 0`
    };

    const results = {};
    
    for (const [key, query] of Object.entries(queries)) {
      const result = await executeQuery(query);
      results[key] = result[0];
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/userstore:
 *   get:
 *     summary: Store do usuário
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: oiduser
 *         schema:
 *           type: integer
 *         description: ID do usuário
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número da página
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Tamanho da página
 *     responses:
 *       200:
 *         description: Items da store
 */
app.get('/api/userstore', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  try {
    const { oiduser, page = 1, size = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(size);
    
    let query = `
      SELECT UserStoreSeqNo, OidUser, ProductID, ProductNo, GiftType, ConfirmType, 
             InventorySeqno, UseDate, SendOidUser, SendNickname, Message, RecvDate, 
             orderno, ordernofaillog, enddate 
      FROM COMBATARMS.dbo.CBT_UserStore
      WHERE 1=1
    `;

    let params = { offset, size: parseInt(size) };
    if (oiduser) {
      query += ` AND OidUser = @oiduser`;
      params.oiduser = parseInt(oiduser);
    }

    query += ` ORDER BY RecvDate DESC`;
    query += ` OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY`;

    const results = await executeQuery(query, params);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Status da API
 */
app.get('/health', async (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  try {
    await executeQuery('SELECT 1');
    res.json({ 
      status: 'OK', 
      database: 'Connected',
      server: process.env.SQL_SERVER_HOST,
      timestamp: new Date().toISOString() 
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      database: 'Disconnected',
      error: error.message,
      timestamp: new Date().toISOString() 
    });
  }
});

/**
 * @swagger
 * /:
 *   get:
 *     summary: Informações da API
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Info básica da API
 */
app.get('/', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  res.json({
    message: 'Combat Arms Brasil Server API',
    version: '1.0.0',
    database: 'SQL Server',
    documentation: '/api-docs',
    endpoints: [
      'GET /api/users?discordid=<discordid>&page=<page>&size=<size>',
      'GET /api/inventory?discordid=<discordid>&page=<page>&size=<size>',
      'GET /api/clans?clanname=<clanname>&page=<page>&size=<size>',
      'GET /api/clanmembers?clanname=<clanname>&page=<page>&size=<size>',
      'GET /api/ranking?type=<exp|kills|wins|money|headshots>&page=<page>&size=<size>',
      'GET /api/stats',
      'GET /api/userstore?oiduser=<oiduser>&page=<page>&size=<size>',
      'GET /health'
    ]
  });
});

app.use((error, req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  console.error('Error:', error);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Algo deu errado'
  });
});

process.on('SIGINT', async () => {
  console.log('Encerrando servidor...');
  if (pool) {
    await pool.close();
  }
  process.exit(0);
});

async function startServer() {
  await initializeDatabase();
  
  const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '0.0.0.0';
  const actualPort = process.env.PORT || port;
  
  app.listen(actualPort, host, () => {
    const serverUrl = process.env.NODE_ENV === 'production' 
      ? `https://${process.env.RENDER_EXTERNAL_HOSTNAME || 'game-stats-e908.onrender.com'}`
      : `http://localhost:${actualPort}`;
      
    console.log(`🚀 Servidor rodando na porta ${actualPort}`);
    console.log(`📊 API disponível em ${serverUrl}`);
    console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📚 Documentação Swagger em ${serverUrl}/api-docs`);
    console.log(`💾 Conectado ao SQL Server: ${process.env.SQL_SERVER_HOST}`);
    console.log(`🎮 Database: ${process.env.SQL_SERVER_DATABASE}`);
  });
}

startServer().catch(error => {
  console.error('❌ Erro ao iniciar servidor:', error);
  process.exit(1);
});

module.exports = app;