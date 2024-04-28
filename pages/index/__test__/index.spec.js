
describe('测试自定义miniprogram-automator选择器', () => {
  let page

  beforeAll(async () => {
    page = await miniProgram.reLaunch('/pages/index/index')
  })

  it('class选择器', async () => {
    const container = await customSelector(page, '.container')
    const id = await container[0].attribute('id')
    expect(id).toBe('container')
  })

  it('id选择器', async () => {
    const container = await customSelector(page, '#container')
    const cls = await container[0].attribute('class')
    expect(cls).toBe('container')
  })

  it('组合选择器', async () => {
    const container = await customSelector(page, 'view.container')
    const id = await container[0].attribute('id')
    expect(id).toBe('container')
  })

  it('后代选择器', async () => {
    const btnWraps = await customSelector(page, 'custom-comp .btn-wrap')
    const buttons = await customSelector(page, 'custom-comp button')
    expect(btnWraps.length).toBe(2)
    expect(buttons.length).toBe(6)
  })

  it('属性选择器', async () => {
    const btnJS = await customSelector(page, 'custom-comp button[type=primary]')
    const btnTxt = await btnJS[0].text()
    expect(btnJS.length).toBe(2)
    expect(btnTxt).toBe('JS-1')
  })

  it('文本选择器', async () => {
    const btnWXML = await customSelector(page, 'custom-comp button:text(WXML)')
    const btnTxt1 = await btnWXML[0].text()
    const btnTxt2 = await btnWXML[1].text()

    expect(btnWXML.length).toBe(2)
    expect(btnTxt1).toBe('WXML-1')
    expect(btnTxt2).toBe('WXML-2')
  })

  it('正向下标选择器', async () => {
    const button = await customSelector(page, 'custom-comp button:nth(1)')
    const type = await button[0].attribute('type')
    const txt = await button[0].text()

    expect(type).toBe('default')
    expect(txt).toBe('WXML-1')
    expect(button.length).toBe(1)
  })

  it('逆向下标选择器', async () => {
    // 选择倒数第3个button
    const button = await customSelector(page, 'custom-comp button:nth-r(-3)')
    const type = await button[0].attribute('type')
    const txt = await button[0].text()

    expect(type).toBe('primary')
    expect(txt).toBe('JS-2')
    expect(button.length).toBe(1)
  })

  it('嵌套选择器', async () => {
    const target = await customSelector(page, 'custom-comp .btn-wrap{button:text(JS-2)} button[type=warn]')
    const targetNoExist = await customSelector(page, 'custom-comp .btn-wrap{button:text(JS-2)} button:text(JSON-1)')
    const txt = await target[0].text()

    expect(txt).toBe('JSON-2')
    expect(target.length).toBe(1)
    expect(targetNoExist.length).toBe(0)
  })

  it('多级嵌套', async () => {
    // 这个嵌套本身没有什么意义，只是用来证明多级嵌套能正常工作
    const target = await customSelector(page, 'view.container custom-comp{view.btn-wrap{button[type=primary]}} .btn-wrap{button:text(WXML-1)} button[type=warn]')
    const txt = await target[0].text()

    expect(target.length).toBe(1)
    expect(txt).toBe('JSON-1')
  })
})