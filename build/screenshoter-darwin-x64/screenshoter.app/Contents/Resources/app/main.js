const electron = require('electron')
const url = require('url')
const path = require('path')
const fs = require('fs')

const {app, BrowserWindow, Menu, ipcMain} = electron

let mainWindow
let addWindow

let userPrefsFile = "userPrefs.json"

let prefs

// listen for app to be ready

app.on('ready', () => {
    createConfigWindow()
})


app.on('window-all-closed', () => {
    app.quit()
})


function createConfigWindow(){

    addWindow = new BrowserWindow({
        width: 920,
        height: 650,
        title: 'HTML Screenshoter Configuration'
    })

    addWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'addWindow.html'),
        protocol: 'file:',
        slashes: true
    }))

    getPrefs()

    addWindow.once('focus', () => {
        setTimeout(() => {
            console.log("sending prefs")
            addWindow.webContents.send('item:userprefs', prefs)
        }, 500)
    })

    // Build menu from template

    const addMenu = Menu.buildFromTemplate(mainMenuTemplate)

    Menu.setApplicationMenu(addMenu)
}

// handle create screenshot window
let frameWidth = 0
let frameHeight = 0
let frameAutoheight = 0

let delay = 0
let time = 0

function createScreenWindow(width, height, autoheight){
    frameWidth = width ? width : 1920
    frameHeight = height ? height : 1080
    frameAutoheight = autoheight

    console.log("Width: "+frameWidth +" Height: "+frameHeight+" AutoHeight: "+frameAutoheight)

    mainWindow = new BrowserWindow({
        width: parseInt(frameWidth),
        height: parseInt(frameHeight),
        frame: false,
        titleBarStyle: 'hidden'
    })

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'mainWindow.html'),
        protocol: 'file:',
        slashes: true
    }))

    mainWindow.on('closed', () => {
        mainWindow = null
    })
}

let begin = 0
let mainPath = ""

ipcMain.on('item:add', (e, item) => {
    mainPath = item
    begin++
})
ipcMain.on('item:width', (e, item) => {
    frameWidth = item
    console.log(frameWidth)
    begin++
})
ipcMain.on('item:height', (e, item) => {
    frameHeight = item
    console.log(frameHeight)
    begin++
})
ipcMain.on('item:autoheight', (e, item) => {
    frameAutoheight = item
    begin++
})

setInterval(() => {
    if(begin == 4){
        createScreenWindow(frameWidth, frameHeight, frameAutoheight)
        savePrefs()
        setTimeout(() => {
            mainWindow.webContents.send('item:add', mainPath)
            mainWindow.webContents.send('item:delay', delay)
            mainWindow.webContents.send('item:time', time)

            mainWindow.webContents.send('item:width', frameWidth)
            mainWindow.webContents.send('item:height', frameHeight)
            mainWindow.webContents.send('item:autoheight', frameAutoheight)
        }, 1000)

        addWindow.close()
        begin = 0;
    }
}, 10)


function getPrefs(){
    fs.readFile(path.resolve(__dirname, userPrefsFile), "utf8", (err, data) => {
        if(err) return console.error("Error getting user settings: "+err)
        prefs = JSON.parse(data)
        console.log("Width: " + prefs["screenshot"]["width"])
        console.log("Height: " + prefs["screenshot"]["height"])
        console.log("AutoHeight: " + prefs["screenshot"]["autoheight"])
        console.log("Path: " + prefs["path"])
        console.log("Delay: " + prefs["delay"])
        console.log("Time: " + prefs["time"])
    })
}

function savePrefs(){
    prefs["screenshot"]["width"] = frameWidth
    prefs["screenshot"]["height"] = frameHeight
    prefs["screenshot"]["autoheight"] = frameAutoheight
    prefs["path"] = mainPath
    prefs["delay"] = delay
    prefs["time"] = time
    console.log(prefs)

    fs.writeFile(path.resolve(__dirname, userPrefsFile), JSON.stringify(prefs, null, 2), (err) => {
        if(err) return console.log("Cannot write refs file: " + err)
    })
}

ipcMain.on('item:done', (e) => {
    createConfigWindow()
    mainWindow.close()
})

ipcMain.on('item:delay', (e, item) => {
    delay = item
})

ipcMain.on('item:time', (e, item) => {
    time = item
})

ipcMain.on('item:toScreen', (e, item) => {
    console.log("Screenshot taken from: "+item)
})

const mainMenuTemplate = [
    {
        label: 'App',
        submenu: [
            // {
            //     label: 'Select folder',
            //     click(){
            //         createAddWindow()
            //     }
            // },
            {
                label: 'Quit',
                accelerator: process.platform == 'darwin' ? 'Command+Q' : 'Ctrl+Q',
                click(){
                    app.quit()
                }
            }
        ]
    }
]

if(process.env.NODE_ENV != 'production'){
    mainMenuTemplate.push({
        label: 'Dev Tools',
        submenu: [
            {
                label: 'Open Dev Tools',
                accelerator: process.platform == 'darwin' ? 'Command+I' : 'Ctrl+I',
                click(item, focusedWindow){
                    focusedWindow.toggleDevTools()
                }
            },
            {
                role: 'reload',
            }
        ]
    })
}