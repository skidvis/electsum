/**
 * Created by skidvis on 1/24/14.
 */

/*
    xTODO: avoid saving password in cleartext, use hash of password.
    xTODO: read _addressCount into slider in Settings page.
    xTODO: add totalBTC to 1st listitem.
    xTODO: generate QR for addresses.
    TODO: add Sharing feature to addresses.
    xTODO: list USD next to BTC on Details page.
    xTODO: change color if btc > 0.
 */

var mySettings = window.localStorage;
var _wordList; // = "hide bullet glow horrible crawl shatter view breath inside today wife seven";
//mpk: ee93eb869f0778c38b86dd5088c2c63a760e9c1c6b2462f808be927db23940c974691e52b36d56db307aef6aee7cdf7edfc50fd47f8037d03e8fb90a1168808e
var _password;
var _addressCount = 15;
var _addresses = [];
var _totalBTC = 0;
var _retrievedBals = 0;
var _activeAddress;
var _retrievedAddresses = [];
var _currentPrice;
var _count = 0;
var _callbacks = $.Callbacks();

$(document).ready(function(){
    document.addEventListener("resume", main, false);
    $("#btnPassword").on('tap', verifyPassword);
    $("#btnMnemonic").on('tap', saveMnemonic);
    $("#btnCam").on('tap', clickScan);
    $("#btnCamSettings").on('tap', clickScanSettings);
    $("#btnSetupPassword").on('tap', setupPassword);
    $("#btnSetupMnemonic").on('tap', setupMnemonic);
})

$(document).on("click", '.link' ,function(e) {
    e.preventDefault();
    _activeAddress = $(this).data("address");
    _activeBTC = $("#address_" + _activeAddress).text();
    $.mobile.changePage(this.href, {transition: 'slide', role: 'page'});
});

$(document).on('pageshow', '#home', function(){
    _totalBTC = 0;
    if(mySettings.getItem("password") === null){
        $.mobile.changePage('#setup');
    }else{
        getPrice();
        main();
    }
});

$(document).on("click", '#electrumLink', function(){
    window.open("http://electrum.org", '_system');
});

$(document).on('pageshow', '#settings', function(){
    $(".lockedSettings").css("display", "none");
    $("#settingsLogin").css("display", "block");
    $("#settingsNotice").text('');
    $("#slider-1").val(_addressCount);

});

$(document).on('pageshow', '#detail', function(){
    getDetails();
    $("#detailAddress").text(_activeAddress);
    $(document).on("click", '#detailLink', function(){
        window.open("https://blockchain.info/address/" + _activeAddress, '_system');
    });
    $(document).on("click", '#qr', function(){
        window.open("bitcoin://" + _activeAddress, '_system');
    });
    $("#qr").text('');
    new QRCode(document.getElementById('qr'), 'bitcoin://' + _activeAddress);
})

function main(){
    //My beebs is the greatest!
    $("#addresses").text('');
    _totalBTC = 0;
    _retrievedBals = 0;
    $("#totalBTC").text("Loading..");

    //$("#addresses").text('');
    $("#addresses").append('<li><span id="loaded"></span><div id="notice">Getting addresses...</div> <div id="progress"></div><div class="amount"><span id="total"></span><span id="totalBTC"></span></div></li>');
    $("#addresses").listview('refresh');

    setDefaults();
    if(mySettings.getItem("addresses") == null){
        getLocalAddresses();
    }else{
        _addresses = JSON.parse(mySettings.getItem("addresses"));
        showAddress();
        $("#notice").text(_addressCount + " addresses retrieved.");
    }
    $("#slow").css("display", "none");
    $("#total").text("0");
    $("#totalBTC").text("/" + _addressCount);
}

function setDefaults(){
    if(mySettings.getItem("addressCount") === null){
        mySettings.setItem("addressCount", _addressCount);
    }else{
        _addressCount = mySettings.getItem("addressCount");
    }
}

function getLocalAddresses(){
    var iLoop = 0;
    var myAddy;
    $("#notice").text("Generating addresses, please wait...");
    $("#addresses").listview('refresh');
    addressCheck();
}

function addressCheck(){
    if(_count == 100){
        mySettings.setItem("addresses", JSON.stringify(_addresses));
        showAddress();
        $("#notice").text(_addressCount + " addresses generated.");
    }else{
        $("#progress").text(_count + '%');
        //setTimeout(getAddressN2(_wordList, _count),100000);
        setTimeout(function(){getAddressN2()},20);
    }
}



function getPrice(){
    $.ajax({
        url: 'https://coinbase.com/api/v1/prices/spot_rate' ,
        dataType: "json",
        async: true,
        success: function (result) {
            _currentPrice = result.amount;
            $("#btcPrice").text('1 BTC = $' + _currentPrice);
        },
        error: function(){
            _currentPrice = 'error';
            $("#btcPrice").text('BTC price unavailable.');
        }
    });
}

function getJSON(address){
    $.ajax({
        url: 'http://blockchain.info/rawaddr/' + address ,
        dataType: "json",
        async: true,
        success: function (result) {
            updateList(address, result);
        },
        error: function (request,error) {
            $("#notice").text('Blockchain data unavailable, try again later. ');
        }
    });
}

function showAddress(){
    var address;
    var iLoop = 0;
    for(iLoop; iLoop < _addressCount; iLoop++){
            address = _addresses[iLoop];
            getJSON(address);
            $("#addresses").append('<li><span class="address" style="font-weight:bold;"><a href="#detail" class="link" data-address="' + address + '">' + address + '</a></span><span class="amount" id="address_' + address + '">Loading</span><div></div></li>');
            $("#addresses").listview('refresh');
        };
        resizeText();
        $('#progress').text('');
}

function updateList(address, result){
    if(_retrievedBals > _addressCount-1){
        _retrievedAddresses = [];
        return;
    }
    var amount = (result.final_balance/100000000);
    _retrievedAddresses.push({address:address, amount:amount});

    _retrievedBals++;
    $("#total").text(_retrievedBals);

    $("#address_" + address).text(amount.toFixed(4));
    if(amount > 0){
        $("#address_" + address).css("color", "#0a0");
    }

    if(_retrievedBals == _addressCount){
        _totalBTC = 0;

        _retrievedAddresses.forEach(function(item){
            _totalBTC += item.amount;
        })

        $("#total").text("Total: ");
        $("#totalBTC").text(_totalBTC.toFixed(4));

        if(_totalBTC > 0){
            $("#totalBTC").css("color", "#0a0");
        }else{
            $("#totalBTC").css("color", "#f00");
        }

        _retrievedAddresses = [];
    }
}

function updateTotals(){

}

function verifyPassword(){
    var enteredPassword = Crypto.SHA256($("#txtPassword").val());
    var storedPassword = mySettings.getItem("password");
    if(enteredPassword === storedPassword){
        _password = $("#txtPassword").val();
        $("#txtPassword").val('');
        $("#settingsLogin").css("display","none");
        _wordList = CryptoJS.AES.decrypt(mySettings.getItem("wordlist"), _password).toString(CryptoJS.enc.Utf8);
        $("#txtMnemonic").text(_wordList);
        $(".lockedSettings").css("display", "block");
        $("#settingsNotice").text('');
    }else{
        $("#settingsNotice").text('Incorrect Password.');
    }
}

function saveMnemonic(){
    if($("#txtMnemonic").val() != _wordList){
        _wordList = $("#txtMnemonic").val();
        mySettings.setItem("wordlist", CryptoJS.AES.encrypt(_wordList, _password).toString());
        $("#settingsLogin").css("display","block");
        $(".lockedSettings").css("display", "none");
        mySettings.removeItem("addresses");
        _addresses = [];
        $("#settingsNotice").text('Change Saved. Will Regenerate Keys.');
    }else{
        $("#settingsNotice").text('No Change Detected.');
    }
}

function changeAddressCount(value){
    mySettings.setItem('addressCount', value);
    //mySettings.removeItem('addresses');
    _addressCount = value;
    //_addresses = [];
    $("#settingsNotice").text('Change Saved.');
}

function resizeText(){
    var originalFontSize = 14;
    var sectionWidth = $('#addresses').width();

    $('.address').each(function(){
        var spanWidth = $(this).width();
        var newFontSize = (sectionWidth/spanWidth) * originalFontSize;
        $(this).css({"font-size" : newFontSize, "line-height" : newFontSize/1.2 + "px"});
    });
}

function setupPassword(){
    if($("#txtSetupPassword1").val() == ''){
        $("#setupNotice").text("Password cannot be blank!");
        return;
    }
    if($("#txtSetupPassword1").val() != $("#txtSetupPassword2").val()){
        $("#setupNotice").text("Passwords must match!");
        return;
    }
    _password = $("#txtSetupPassword1").val()
    mySettings.setItem("password", Crypto.SHA256(_password));
    $("#setupPassword").css("display", "none");
    $("#setupMnemonic").css("display", "block");
    $("#setupNotice").text('');
}

function setupMnemonic(){
    if($("#txtSetupMnemonic").val() == ''){
        $("#setupNotice").text("MPK cannot be blank!");
        return;
    }
    _wordList = $("#txtSetupMnemonic").val();
    mySettings.setItem("wordlist", CryptoJS.AES.encrypt(_wordList, _password).toString());
    $.mobile.changePage('#home');
}

function getDetails(){
    $("#detailBTC").css("color", "#000");
    $("#detailBTC").text("Loading");
    $("#detailUSD").text("Loading");
    var amount = 0;
    var amountUSD = 0;
    $.ajax({
        url: 'http://blockchain.info/rawaddr/' + _activeAddress ,
        dataType: "json",
        async: true,
        success: function (result) {
            amount = (result.final_balance/100000000);
            $("#detailBTC").text(amount.toFixed(8));
            if(_currentPrice != 'error'){
                amountUSD = (amount/(1/_currentPrice)).toFixed(2);
                $("#detailUSD").text("$" + amountUSD + " @ $" + _currentPrice + "/BTC");
            }else{
                $("#detailUSD").text("Price conversion unavailable.");
            }

            if(amount > 0){
                $("#detailBTC").css("color", "#0a0");
            }
        }
    });
}

function clickScan() {
    cordova.plugins.barcodeScanner.scan(
        function (result) {
            $("#txtSetupMnemonic").val(result.text);
        },
        function (error) {
            alert("Scanning failed: " + error);
        });
}

function clickScanSettings() {
    cordova.plugins.barcodeScanner.scan(
        function (result) {
            $("#txtMnemonic").val(result.text);
        },
        function (error) {
            alert("Scanning failed: " + error);
        });
}

function getAddressN2() {
    // convert to byte array
    var num = _count;
    mpk = Crypto.util.hexToBytes(_wordList);

    // clone the mpk
    var pubKey = mpk.slice(0);
    pubKey.unshift(4); // prepend '4' to the array

    var curve = getSECCurveByName('secp256k1'),
        mode = 0;

    var bytes = Crypto.charenc.UTF8.stringToBytes(num + ':' + mode + ':').concat(mpk),
        sequence = Crypto.SHA256(Crypto.SHA256(bytes, { asBytes: true }), { asBytes: true }),
        pt = ECPointFp.decodeFrom(curve.getCurve(), pubKey),
        A = BigInteger.fromByteArrayUnsigned(sequence);

    pt = pt.add(curve.getG().multiply(A));

    var newPriv = [];

    for (; newPriv.length < 32;) {
        newPriv.unshift(0x00);
    }

    var newPub = pt.getEncoded();

    var h160 = Bitcoin.Util.sha256ripe160(newPub),
        addr = new Bitcoin.Address(h160);

    _addresses.push(addr.toString());
    _count++;
    addressCheck();
}