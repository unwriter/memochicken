require('dotenv').config()
var axios = require('axios')
var datacash = require('datacash')
var EventSource = require('eventsource')
const hashtag = "#memochicken"
var memo = function() {
  var query = {
    "v": 3,
    "q": {
      "db": ["u"],
      "find": {
        "out.h1": "6d02",
        "out.s2": {
          "$regex": hashtag, "$options": "i"
        },
        "out.e.a": process.env.address
      }
    },
    "r": {
      "f": "[.[] | .tx.h as $tx | .out[] | select(.b0.op? == 118) | { output: ., tx: $tx } ]"
    }
  }
  var b64 = Buffer.from(JSON.stringify(query)).toString("base64")
  var bitsocket = new EventSource('https://bitsocket.org/s/'+b64)
  bitsocket.onmessage = async function(e) {
    let data = JSON.parse(e.data)
    console.log(JSON.stringify(data, null, 2))
    if (data.type === 'mempool') {
      let amount = await convert(0.5, "USD")
      let res;
      data.data.forEach(function(item) {
        if (item.output.e.a === process.env.address) {
          res = item
        }
      })
      if (res) {
        console.log(`[${res.tx}]  ${res.output.e.v}`)
        console.log("threshold = ", amount)
        if (res.output.e.v > amount) {
          console.log("passed condition...")
          hand("chicken")
        }
      }
    }
  }
}
var hand = async function(name) {
  console.log("[hand]", name)
  let result = await axios.get("https://api.handcash.io/api/receivingAddress/" + name)
  let addr = result.data.cashAddr
  let amount = await convert(0.5, "USD")
  let rounded = Math.ceil(amount)
  console.log("[Sending]", rounded, "to", addr)
  datacash.send({
    cash: {
      key: process.env.privateKey,
      to: [{ address: addr, value: rounded }]
    }
  }, function(err, tx) {
    if (err) {
      console.log("[Error]", err)
    } else {
      console.log("[Sent]", tx)
    }
    console.log("\n")
  })
}
var convert = async function(amount, unit) {
  let currency = await axios.get("https://api.coinbase.com/v2/exchange-rates?currency=BCH")
  let rate = currency.data.data.rates[unit]
  let converted = (amount / rate) * 100000000
  return converted
}
memo()
