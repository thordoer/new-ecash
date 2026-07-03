// register-webhooks.js
const axios = require("axios");

// ============= YOUR 40 BOTS CONFIGURATION =============
// REPLACE THESE WITH YOUR ACTUAL BOT TOKENS AND CHAT IDs!
BOTS = [
  {
    name: "user1",
    token: "8853866579:AAHaNTbCwfn3KhbaovHEhvNTHMrjh46zdzs",
    chatId: "7544733524",
  },
  {
    name: "client2",
    token: "8911459682:AAHX2iRw-k2X98UILOSqsqrzKflSHbGw6YE",
    chatId: "6799434009",
  },
  {
    name: "client3",
    token: "8768083938:AAEUAKEXA4K5rYS851RGuezJukuGwocXjNA",
    chatId: "7992766077",
  },
  {
    name: "client4",
    token: "8807320895:AAGAOC5-PXHyIbN-xF3EZdFpq_bhnQP9CLM",
    chatId: "7074689702",
  },
  {
    name: "client5",
    token: "8415451224:AAEjjbU3riAP14d69txJo33o1DKQB7o7XZ8",
    chatId: "8104507429",
  },
  {
    name: "client6",
    token: "8474678355:AAFZZLBuV-y4Lywr_JrtWzcmX04IsWqf3YM",
    chatId: "7068940909",
  },
  {
    name: "client7",
    token: "8988738471:AAFyzJIteY4cXaTbRPMIFZ5i6IRRWueIN2U",
    chatId: "8964197711",
  },
  {
    name: "client7",
    token: "8478610508:AAGI-hObc4twcP106AqzRa4UpQ2q3W9OkNU",
    chatId: "8543141239",
  },
  {
    name: "client8",
    token: "8816885590:AAHsiJR2YBtNbG1ELLbemLRPJQ8sFffwbkA",
    chatId: "8556187861",
  },
  {
    name: "client9",
    token: "8833081042:AAG6pzOXGz6esGkmze-iAfsC-_b-heLklms",
    chatId: "6177586192",
  },
  {
    name: "client10",
    token: "8930910351:AAEZ_2Tk35R6P9N1jk2ueygoK00aHfOBmW0",
    chatId: "6381465618",
  },
  {
    name: "client11",
    token: "8899878724:AAFwyqNO2R2DhP7c08yjc_nBTdbi3h7XtJw",
    chatId: "8649702205",
  },
  {
    name: "client12",
    token: "8892742454:AAE5hfF9O4kR0u37XS_anZYw-VIQ9V4tiio",
    chatId: "8851553773",
  },
  // {
  //   name: "client13",
  //   token: "8527542052:AAEck83zuXeQNxRSEYO-d3ZMPWLv_LsBzME",
  //   chatId: "8227751775",
  // },
  // {
  //   name: "client14",
  //   token: "8577056105:AAHzDjkRI2unAvkagXOPiUtDqPrTvwza2L8",
  //   chatId: "8474091893",
  // },
  // {
  //   name: "client15",
  //   token: "8398327087:AAFO7lZXjpaHEDLRLMmgDnNXHccSbjQzr_U",
  //   chatId: "8393736299",
  // },
  // {
  //   name: "client16",
  //   token: "8179361269:AAFHjdbguFR5__uaHX7vVUEAq8q3ocjToGQ",
  //   chatId: "6021146671",
  // },
  // {
  //   name: "client17",
  //   token: "8285962033:AAGHLGhMyGicE2lIlckZUFJPW1UMgDyIprE",
  //   chatId: "7539929909",
  // },
  // {
  //   name: "client18",
  //   token: "8285962033:AAGHLGhMyGicE2lIlckZUFJPW1UMgDyIprE",
  //   chatId: "7539929909",
  // },
  // {
  //   name: "client19",
  //   token: "8549049303:AAGrQ357tiJU-aY7xsglrkF02_fBjTwN04E",
  //   chatId: "6630989510",
  // },
  // {
  //   name: "client20",
  //   token: "8513396363:AAFfu6fOre6HCytpw3FF6S2DMwQQ7htaBmY",
  //   chatId: "8560637991",
  // },
  // {
  //   name: "client21",
  //   token: "8071741886:AAE8rgp7osHP_WXhoo3CrV5R57id36J4efw",
  //   chatId: "7078547218",
  // },
  // {
  //   name: "client22",
  //   token: "8506891859:AAFow_l6KYqZ7w_qnEcIvJWEG12JU5fO4I8",
  //   chatId: "7544733524",
  // },
  // {
  //   name: "client23",
  //   token: "8403554766:AAE-DpJ-C4gO4jVcpaYrFC2_Af3Ck5yx16I",
  //   chatId: "8542655094",
  // },
  // {
  //   name: "client24",
  //   token: "8456019920:AAFMPR3UIuXCuSh2sijyhfTbffl5BGqB-Gw",
  //   chatId: "6329192290",
  // },
  // {
  //   name: "client25",
  //   token: "8132977847:AAGhbzdIVqPHvu81veaDF6fvJj481-Gjf30",
  //   chatId: "6816093099",
  // },
  // {
  //   name: "client26",
  //   token: "7998279104:AAFkSmS06yaSmUw7DWJ8cYElc7cHrUeKN6s",
  //   chatId: "8575051751",
  // },
  // {
  //   name: "client27",
  //   token: "8335793447:AAFqH0u2fm4Pk4bpTrA2PcSo1FGFoJQu0UI",
  //   chatId: "8293861117",
  // },
  // {
  //   name: "client28",
  //   token: "8226218788:AAFW2D0o-45hXomO4jxDN-FFgRXsk9RgCaU",
  //   chatId: "7238368495",
  // },
  // {
  //   name: "client29",
  //   token: "8505978944:AAGjiVb8dnPsYuEJHQ4LrECCx2wFATWN8Es",
  //   chatId: "7992766077",
  // },
  // {
  //   name: "client30",
  //   token: "8221352311:AAGJmMn2mIn73STRHHF9s3Gl8Rx9cg7enk8",
  //   chatId: "8407364130",
  // },
  // {
  //   name: "client31",
  //   token: "8514289235:AAGkcbdlcv-N6tXTOzJ0-id1qh1z0qlvLq8",
  //   chatId: "8139029810",
  // },
  // {
  //   name: "client32",
  //   token: "8393990776:AAGvOd88y8u0P0RcjaxB5q1YnJP38u7k6AA",
  //   chatId: "8079830538",
  // },
  // {
  //   name: "client33",
  //   token: "8507237286:AAHP3XCimuPx8qh3ai9Nn8hNXBhAN3A22PI",
  //   chatId: "8502870902",
  // },
  // {
  //   name: "client34",
  //   token: "8574721722:AAH9vMi2l4nOSg-ic0CxDiNcGqLEjetd3Do",
  //   chatId: "6799434009",
  // },
  // {
  //   name: "client35",
  //   token: "8522638777:AAHY1fNSVFzaQLL3E_4HJSDjJj-xnxwQotw",
  //   chatId: "6434324181",
  // },
  // {
  //   name: "client36",
  //   token: "8138871857:AAF-H5sefZMazfCbPwjTtzteY7I_Zi3wxfg",
  //   chatId: "8327549936",
  // },
  // {
  //   name: "client37",
  //   token: "8327359071:AAF9bJsriAbdjasM_9jZEW9Shstip3sMJfw",
  //   chatId: "7007595013",
  // },
  // {
  //   name: "client38",
  //   token: "8542782622:AAF0G4Vs6nc31fKCvKeIY6UM8cdv9_ZvGY8",
  //   chatId: "6063775797",
  // },
  // {
  //   name: "client39",
  //   token: "8021143949:AAGVQ7vC6b0yCaQI83-VCe7TOXURHCzn1HM",
  //   chatId: "263207105",
  // },
  // {
  //   name: "client40",
  //   token: "8229846814:AAFWxfvtbH1iUaqyvpSozOytsdrAJ7PmQqs",
  //   chatId: "6542129651",
  // },
  // {
  //   name: "client41",
  //   token: "8390016398:AAEH_Ibixwm-krOf7T7KIWFIlDiiAbopI9w",
  //   chatId: "8270241547",
  // },
  // {
  //   name: "client42",
  //   token: "7732774629:AAGtvbvAmZa8asgWXtYTRbES5EWCCsMbriU",
  //   chatId: "8257999418",
  // },
  // {
  //   name: "client43",
  //   token: "8329616460:AAG7KtjBR1HOEchbw2LXzvXU0vcqaz5unjY",
  //   chatId: "7973653220",
  // },
  // {
  //   name: "client44",
  //   token: "7600663267:AAF-9BuF0ghd3AjkHmhFKXp4LnQnK0roox0",
  //   chatId: "8485703683",
  // },
];

// ============= YOUR SINGLE SERVER URL =============
// REPLACE THIS WITH YOUR ACTUAL SERVER URL!
// After you deploy the single server, you'll get a URL like:
// - Railway: https://your-project.railway.app
// - Render: https://your-project.onrender.com
const NEW_SERVER_URL = "https://ikwongie.onrender.com"; // ⬅️ CHANGE THIS!
//https://ikwongie.onrender.com
// ============= MAIN FUNCTION =============
async function registerAllWebhooks() {
  console.log(`🔧 Setting up ${BOTS.length} webhooks...\n`);

  let successCount = 0;
  let failedBots = [];

  for (const bot of BOTS) {
    const webhookUrl = `${NEW_SERVER_URL}/webhook/${bot.name}`;

    try {
      console.log(`📡 [${bot.name}] Setting webhook...`);
      console.log(`   URL: ${webhookUrl}`);

      const response = await axios.post(
        `https://api.telegram.org/bot${bot.token}/setWebhook`,
        {
          url: webhookUrl,
          drop_pending_updates: true,
          max_connections: 40,
        },
        { timeout: 15000 },
      );

      if (response.data.ok) {
        console.log(`   ✅ Success!\n`);
        successCount++;
      } else {
        console.log(`   ❌ Failed: ${response.data.description}\n`);
        failedBots.push({ name: bot.name, error: response.data.description });
      }
    } catch (error) {
      console.log(`   💥 Error: ${error.message}\n`);
      failedBots.push({ name: bot.name, error: error.message });
    }

    // Wait 200ms between requests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  // ============= RESULTS =============
  console.log("=".repeat(50));
  console.log("📊 REGISTRATION RESULTS:");
  console.log("=".repeat(50));
  console.log(`✅ Successful: ${successCount}/${BOTS.length}`);
  console.log(`❌ Failed: ${failedBots.length}`);

  if (failedBots.length > 0) {
    console.log("\n❌ Failed bots:");
    failedBots.forEach((bot) => {
      console.log(`   • ${bot.name}: ${bot.error}`);
    });
  }

  console.log("\n🎉 Webhook setup complete!");
  console.log(`🌐 Your single server: ${NEW_SERVER_URL}`);
}

// ============= VERIFY FUNCTION =============
async function verifyWebhooks() {
  console.log("\n🔍 Verifying webhooks...\n");

  for (const bot of BOTS) {
    try {
      const response = await axios.get(
        `https://api.telegram.org/bot${bot.token}/getWebhookInfo`,
        { timeout: 10000 },
      );

      if (response.data.ok) {
        const info = response.data.result;
        const status = info.url ? "✅ Set" : "❌ Not set";
        console.log(`${status} [${bot.name}] ${info.url || "No webhook set"}`);
      }
    } catch (error) {
      console.log(`💥 [${bot.name}] Failed to verify: ${error.message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

// ============= EXECUTE =============
async function main() {
  console.log("🤖 TELEGRAM WEBHOOK SETUP TOOL");
  console.log("=".repeat(50));

  // Check if BOTS array is empty
  if (BOTS.length === 0 || BOTS[0].token.includes("1234567890")) {
    console.log("❌ ERROR: You need to configure your bot tokens!");
    console.log("\n📝 INSTRUCTIONS:");
    console.log("1. Open register-webhooks.js in a text editor");
    console.log("2. Replace the BOTS array with your 40 bot configurations");
    console.log("3. Replace NEW_SERVER_URL with your actual server URL");
    console.log("4. Run this script again");
    return;
  }

  if (NEW_SERVER_URL.includes("your-new-server")) {
    console.log("❌ ERROR: You need to set your server URL!");
    console.log("\n📝 INSTRUCTIONS:");
    console.log("1. Deploy your single server first");
    console.log("2. Get the URL (e.g., https://your-app.railway.app)");
    console.log("3. Update NEW_SERVER_URL in this script");
    console.log("4. Run this script again");
    return;
  }

  // Ask for confirmation
  console.log(`\n⚠️  This will set webhooks for ${BOTS.length} bots`);
  console.log(`🌐 Server: ${NEW_SERVER_URL}`);
  console.log("\nDo you want to continue? (yes/no)");

  // For simplicity, just run it (you can add readline if you want)
  console.log("\n⏳ Starting webhook registration...\n");

  await registerAllWebhooks();
  await verifyWebhooks();
}

// Run the script
main().catch(console.error);
