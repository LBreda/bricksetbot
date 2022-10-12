import fetch from 'node-fetch'
import { Telegraf } from 'telegraf'
import emoji from 'node-emoji'
import * as dotenv from 'dotenv'
dotenv.config()
const bot = new Telegraf(process.env.TELEGRAM_TOKEN)

// Gets item image link
// Caveat: between '[' and ']' in the link U+200C zero-width character
let getItemImageLink = (item) => {
  return `[‌‌](${item.image.imageURL})`
}

// Gets theme hierarchy
let getItemThemeHierarchy = (item) => {
  return [item.themeGroup, item.theme, item.subtheme].filter(part => part).join(' / ')
}

let getItemSetNumber = (item) => {
  return item.numberVariant ? `${item.number}-${item.numberVariant}` : item.number
}

// Prints a decimal vote as number of stars out of ten
let printRating = (vote) => {
  return emoji.get(vote < 5 ? "confused" : vote < 6.5 ? "expressionless" : "grin") + " " + vote;
}

// Parses a Brickset search item to get a markdow1n description
let bricksetItemToMarkdown = async (item) => {
  let result = getItemImageLink(item)
  result += `*${getItemSetNumber(item)} ${item.name}* (${item.year})\n\n`
  result += "*Theme*: " + getItemThemeHierarchy(item) + "\n"
  result += "*Pieces*: " + item.pieces + "\n"

  if (item.rating != 0) {
    result += "*Rating*: " + printRating(item.rating) + "\n"
  }

  return result
}

// Parses brickset data to get a Telegram inline query response
let bricksetSearchResultsToQueryResponse = (results) => results.map(result => (async () => {
  let message_text = await bricksetItemToMarkdown(result)
  return {
    type: 'article',
    id: result.setID,
    title: `${getItemSetNumber(result)} ${result.name}`,
    description: `${result.year} - ${getItemThemeHierarchy(result)}`,
    thumb_url: result.image.thumbnailURL,
    input_message_content: {
      'message_text': message_text,
      'parse_mode': 'Markdown'
    }
  }
})())

bot.on('inline_query', async (ctx) => {
  let response = [];
  if (ctx.inlineQuery.query) {
    let result = await fetch(`https://brickset.com/api/v3.asmx/getSets?userHash=&apiKey=${process.env.BRICKSET_TOKEN}&params={"query": "${ctx.inlineQuery.query}"}`);
    let data = await result.json()
    response = await Promise.all(bricksetSearchResultsToQueryResponse(data.sets || []))
  }
  return await ctx.answerInlineQuery(response)
})

bot.launch()
