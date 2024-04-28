
// https://developers.weixin.qq.com/miniprogram/dev/api/ui/scroll/wx.pageScrollTo.html
// https://developers.weixin.qq.com/miniprogram/dev/framework/view/wxss.html#%E9%80%89%E6%8B%A9%E5%99%A8

// 冒号状态转移函数
function colonTransition(selector, currI) {
  const nextChar = selector[currI + 1]

  let nextState = ''
  if (nextChar === 'n') {
    if (selector.slice(currI + 1, currI + 5) === 'nth(') {
      currI = currI + 4
      nextState = 'nth-index'
    } else if (selector.slice(currI + 1, currI + 7) === 'nth-r(') {
      if (selector[currI + 7] !== '-') {
        throw new Error('nth-r(n)选择器语法错误，n必须是负数')
      }
      currI = currI + 7 // 同时跳过了负号
      nextState = 'nthR-index'
    } else {
      throw new Error('无法解析选择器语法：' + selector)
    }
  } else if (nextChar === 't' && selector.slice(currI + 1, currI + 6) === 'text(') {
    currI = currI + 5
    nextState = 'text-contains'
  }

  return {
    nextI: currI,
    nextState
  }
}

// 花括号状态转移函数
function curlyBracesTransition(selector, currI) {
  
  let layer = 1

  for (let i = currI; i < selector.length; i++) {
    const char = selector[i]
    if (char === '{') {
      layer++
    } else if (char === '}') {
      if (layer === 1) {
        return {
          nextI: i,
          nextState: 'curly-braces-complete'
        }
      } else {
        layer--
      }
    }
  }

  throw new Error(`${selector}选择器没有结束花括号`)
}

function nextFilterTransition(selector, currI) {
  const char = selector[currI]
  if (char === '{') {
    return {
      nextI: currI,
      nextState: 'curly-braces'
    }
  } else if (char === '[') {
    return {
      nextI: currI,
      nextState: 'attribute'
    }
  } else if (char === ':') {
    return colonTransition(selector, currI)
  }

  throw new Error(`选择器解析错误，无法识别${selector}中的${char}字符`)
}

// 处理不含最外层空格的选择器
async function applySelector(elements, selector) {
  if (selector.trim() === '') return elements
  // 初始化当前状态和当前元素集合
  let currentState = 'tagname'
  let currentElements = elements

  // 初始化选择器相关参数
  let tagName = ''
  let text = ''
  let attributeStr = ''
  let nthIndex = null
  let nthRIndex = null
  let curlyBracesSelector = ''

  // 遍历选择器字符串的每个字符
  for (let i = 0; i < selector.length; i++) {
    const char = selector[i]

    switch (currentState) {
      case 'tagname': // 标签，class，id
        if (['[', ':', '{'].includes(char)) {
          currentState = 'tagname-complete'
          i-- // 不消费当前字符
        } else {
          tagName += char
          if (i === selector.length - 1) {
            currentState = 'tagname-complete'
          }
        }
        break
      case 'curly-braces': {
        const next = curlyBracesTransition(selector, i)
        curlyBracesSelector = selector.slice(i, next.nextI)
        currentState = next.nextState
        i = next.nextI
      }
        break
      
      case 'text-contains': // 正在解析文本
        if (char === ')') {
          currentState = 'text-complete'
        } else {
          text += char
        }
        break

      case 'attribute': // 属性选择器
        // 如果当前字符是属性选择器的结束字符，转移至属性选择器完成状态
        if (char === ']') {
          currentState = 'attribute-complete'
        } else {
          attributeStr += char
        }
        break

      case 'nth-index': // 正向下标选择器
        // 如果当前字符是下标选择器的结束字符，转移至下标选择器完成状态
        if (char === ')') {
          currentState = 'nth-index-complete'
        } else {
          nthIndex = (nthIndex ?? 0) * 10 + parseInt(char, 10)
        }
        break

      case 'nthR-index':
        // 如果当前字符是逆向下标选择器的结束字符，转移至逆向下标选择器完成状态
        if (char === ')') {
          currentState = 'nthR-index-complete'
        } else {
          nthRIndex = (nthRIndex ?? 0) * 10 + parseInt(char, 10)
        }
        break

      case 'tagname-complete':
      case 'curly-braces-complete':
      case 'nthR-index-complete':
      case 'nth-index-complete':
      case 'text-complete': // 文本解析完成
      case 'attribute-complete': { // 解析出完整的属性键值对
        const next = nextFilterTransition(selector, i)
        currentState = next.nextState
        i = next.nextI
        break
      }
    }

    if (currentState === 'tagname-complete') {
      currentElements = await Promise
        .all(currentElements.map(element => element.$$(tagName)))
        .then(res => res.flat())
      tagName = '' // 清空标签名
    }

    if (currentState === 'curly-braces-complete') {
      const flags = await Promise
        .all(currentElements.map(element => customSelector(element, curlyBracesSelector)))
        .then(res => res.map(t => t.length > 0))
      currentElements = currentElements.filter((_, index) => flags[index])
      curlyBracesSelector = '' // 清空花括号选择器
    }

    if (currentState === 'text-complete') {
      const flags = await Promise
        .all(currentElements.map(element => element.text()))
        .then(res => res.map(t => t.indexOf(text) !== -1))

      currentElements = currentElements.filter((_, index) => flags[index])
      text = '' // 清空文本
    }

    // 如果当前状态是属性选择器完成状态，进行筛选
    if (currentState === 'attribute-complete') {
      currentElements = await applyAttributeFilters(currentElements, attributeStr)
      attributeStr = '' // 清空属性选择器数组
    }

    // 如果当前状态是正向下标选择器完成状态，进行筛选
    if (currentState === 'nth-index-complete') {
      currentElements = await applyNthIndex(currentElements, nthIndex)
      nthIndex = null // 清空下标选择器
    }

    // 如果当前状态是逆向下标选择器完成状态，进行筛选
    if (currentState === 'nthR-index-complete') {
      currentElements = await applyNthRIndex(currentElements, nthRIndex)
      nthRIndex = null // 清空逆向下标选择器
    }

    // 如果当前元素集合为空，直接返回空数组
    if (currentElements.length === 0) {
      return []
    }
  }

  return currentElements
}

// 应用属性选择器，筛选出符合条件的元素
async function applyAttributeFilters(elements, attributeString) {
  const [attr, value] = attributeString.split('=').map(str => str.trim())
  // 过滤符合所有属性条件的元素
  const validArr = await Promise
    .all(elements.map(ele => ele.attribute(attr)))
    .then(res => res.map(val => val === value))

  return elements.filter((_, index) => validArr[index])
}

// 应用正向下标选择器，筛选出指定下标的元素
async function applyNthIndex(elements, nthIndex) {
  return [elements[nthIndex]].filter(Boolean) // 过滤掉 null 元素
}

// 应用逆向下标选择器，筛选出指定逆向下标的元素
async function applyNthRIndex(elements, nthRIndex) {
  return [elements[elements.length - nthRIndex]].filter(Boolean) // 过滤掉 null 元素
}

// 解析选择器字符串，返回选择器数组
function parseSelectorString(selectorString) {
  const selectors = []
  let currentSelector = ''
  let inBrackets = 0 // 记录嵌套的选择器筛选符数量

  for (let i = 0; i < selectorString.length; i++) {
    const char = selectorString[i]

    if (char === '{') {
      inBrackets++
    } else if (char === '}') {
      inBrackets--
    }

    if (char === ' ' && inBrackets === 0) {
      // 只有在不在嵌套的选择器筛选符内部才拆分选择器
      selectors.push(currentSelector)
      currentSelector = ''
    } else {
      currentSelector += char
    }
  }

  if (currentSelector !== '') {
    selectors.push(currentSelector)
  }

  return selectors
}

module.exports = async function customSelector(page, selectorString) {
  const s = selectorString.trim()
  let elements = [page]

  if (s.length === 0) return elements

  const selectors = parseSelectorString(s)

  for (const selector of selectors) {
    elements = await applySelector(elements, selector)
  }

  return Array.from(new Set(elements))
}
