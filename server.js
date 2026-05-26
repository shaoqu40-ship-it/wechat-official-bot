import express from "express";
import crypto from "crypto";
import { parseStringPromise } from "xml2js";

const app = express();

const TOKEN = process.env.WECHAT_TOKEN || "micstep_idea_bot_2026";
const PORT = process.env.PORT || 3000;

app.use(express.text({ type: "*/*" }));

function checkSignature(signature, timestamp, nonce) {
  const str = [TOKEN, timestamp, nonce].sort().join("");
  const sha1 = crypto.createHash("sha1").update(str).digest("hex");
  return sha1 === signature;
}

function replyText(toUser, fromUser, content) {
  return `
<xml>
  <ToUserName><![CDATA[${toUser}]]></ToUserName>
  <FromUserName><![CDATA[${fromUser}]]></FromUserName>
  <CreateTime>${Math.floor(Date.now() / 1000)}</CreateTime>
  <MsgType><![CDATA[text]]></MsgType>
  <Content><![CDATA[${content}]]></Content>
</xml>`;
}

// 微信服务器验证
app.get("/api/wechat", (req, res) => {
  const { signature, timestamp, nonce, echostr } = req.query;

  if (!signature || !timestamp || !nonce || !echostr) {
    return res.status(400).send("missing params");
  }

  if (checkSignature(signature, timestamp, nonce)) {
    return res.status(200).send(echostr);
  }

  return res.status(403).send("signature error");
});

// 用户发公众号消息
app.post("/api/wechat", async (req, res) => {
  const { signature, timestamp, nonce } = req.query;

  if (!checkSignature(signature, timestamp, nonce)) {
    return res.status(403).send("signature error");
  }

  try {
    const result = await parseStringPromise(req.body, { explicitArray: false });

    const msg = result.xml;
    const fromUser = msg.FromUserName;
    const toUser = msg.ToUserName;
    const content = msg.Content || "";
    const msgType = msg.MsgType || "";

    console.log("收到公众号消息：", {
      fromUser,
      msgType,
      content,
    });

    let reply = "";

    if (content.trim() === "周报") {
      reply =
        "你的创业想法周报功能正在搭建中。后续会汇总你本周记录的想法、链接和机会方向。";
    } else {
      reply = `已保存到你的创业灵感库：\n\n${content}\n\n你可以继续发送想法、网页链接或用户观察。发送「周报」查看本周整理。`;
    }

    res.setHeader("Content-Type", "application/xml");
    return res.status(200).send(replyText(fromUser, toUser, reply));
  } catch (err) {
    console.error("消息处理失败：", err);
    return res.status(200).send("success");
  }
});

// 健康检查
app.get("/", (req, res) => {
  res.send("wechat official bot is running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
