var fs = require("fs");
var csv = require("csv");

var Converter = {};

var convert = function(uploadFilePath, cb) {
    fs.readFile(uploadFilePath, "utf8", function(err, data) {
        // PARSE
        csv.parse(data, function(err, output) {
            // CREATE ORDERS
            var columns = output.shift();
            var orders = createOrders(output, columns);

            // TRANSLATE
            var translatedOrders = orders.map(function(order) {
                return translate(order);
            });

            // GENERATE CSV
            var orderCSV = createCSV(translatedOrders);
            var downloadFilePath = generateFileName();
            fs.writeFile(downloadFilePath, orderCSV, function(err, data) {
                if (!err)
                    cb(downloadFilePath);
            });
        });
    });
}

var generateFileName = function() {
    var filePath = "downloads/";
    var fileType = ".csv";
    var nameRoot = ["BAGGU", "Retail", "Orders"];
    var now = new Date();
    nameRoot.push(now.getFullYear());
    nameRoot.push(parseInt(now.getMonth()) + 1);
    nameRoot.push(now.getDate());
    nameRoot.push("T"); 
    nameRoot.push(now.getHours() % 12);
    nameRoot.push(now.getMinutes());
    nameRoot.push(now.getSeconds());
    nameRoot.push((now.getHours() >= 12) ? "PM" : "AM");
    nameRoot = nameRoot.join("_");

    var fileName = filePath + nameRoot + fileType;
    return fileName;
}

var createCSV = function(orders) {
    var outputCSV = [];
    var keys = Object.keys(orders[0]);

    outputCSV.push(keys);
    orders = orders.map(function(orderRow) {
        var row = [];
        for (var i in keys) {
            var key = keys[i];
            var value = "\"" + orderRow[key] + "\""; // CSV values need literal quotes. "a","b","c"
            row.push(value);
        }
        row = row.join(",");
        outputCSV.push(row);
    });

    outputCSV = outputCSV.join("\n");
    return outputCSV;
}

var createOrders = function(rows, headers) {
    // create an array of order objects
    var orders = [];

    // Shopify creates a new line for every line item
    // only the first line item has the necessary customer information
    // we need to save that customer information in a reference dictionary
    var orderDictionary = {};
    var lastOrderId = "";
    var lastOrderCount = 0;

    for (var i = 0; i < rows.length; i++) {
        var orderDetails = rows[i];
        var currentOrderId = orderDetails[0];

        var isSameOrder = lastOrderId === currentOrderId;
        lastOrderId = currentOrderId;

        var currentOrder = {};
        if (!isSameOrder && !orderDictionary[currentOrderId]) {
            // We are starting a new order, create an entry in the order dictionary for customer details

            for (var keyIndex in headers) {
                var key = headers[keyIndex];
                currentOrder[key] = orderDetails[keyIndex];
            }

            // store the first order details for reuse
            orderDictionary[currentOrderId] = currentOrder;
            lastOrderCount = 1;
        } else {
            // We are serving the same customer order, use the detail from the dictionary values if they are not present. 
            var referenceOrderDetails = orderDictionary[currentOrderId];
            for (var keyIndex in headers) {
                var key = headers[keyIndex]; 
                currentOrder[key] = orderDetails[keyIndex] || referenceOrderDetails[key];
            }

            // We are serving the same customer order, so increase the line item number count;
            lastOrderCount++;
        }

        // add the line number count
        currentOrder["line_item_number"] = lastOrderCount;
        orders.push(currentOrder);
    }

    return orders;
}

var OnFufillmentTranslators = {
    "order_id": function(data) {
        // required
        if (data["Name"])
            return "SR" + data["Name"].substring(1);
        else
            return "";
    },
    "order_source": function(data) {
        return "";
    },
    "order_date": function(data) {
        // required
        // date of form 2015-10-19 14:01:49 -0700
        // want 10/19/15
        var date = data["Created at"];
        if (date) {
            date = date.split(" ").slice(0,2);
            date = date.join("T");
            return date;
        } else {
            return "";
        }
    },
    "sales_tax": function(data) {
        return data["Taxes"];
    },
    "ord_ship_charge": function(data) {
        return data["Shipping"];
    },
    "total_amount": function(data) {
        return data["Total"];
    },
    "bill_to_name": function(data) {
        return data["Billing Name"];
    },
    "bill_to_address1": function(data) {
        return data["Billing Address1"];
    },
    "bill_to_address2": function(data) {
        return data["Billing Address2"];
    },
    "bill_to_city": function(data) {
        return data["Billing City"];
    },
    "bill_to_state": function(data) {
        return data["Billing Province"];
    },
    "bill_to_zip": function(data) {
         // The ZIP needs to be validified. Sometimes it'll be '94107
        var zip = data["Billing Zip"];
        if (zip) {
            /*
            while (isNaN(parseInt(zip)) && zip.length > 0) {
                zip = zip.substring(1);
            }
            */

            if (zip[0] === "'") {
                zip = zip.substring(1);
            }
            var validZip = zip || "COULD NOT CREATE VALID ZIP, ORIGINAL ZIP MIGHT HAVE INCORRECT CHARACTERS: " + data["Billing Zip"];
            return validZip;
        } else {
            return "";
        }
    },
    "bill_to_country": function(data) {
        return data["Billing Country"];
    },
    "bill_to_phone": function(data) {
        return data["Billing Phone"];
    },
    "bill_to_email": function(data) {
        return data["Email"]; 
    },
    "bill_to_company": function(data) {
        return "";
    },
    "do_not_promote": function(data) {
        return "";
    },
    "credit_card_no": function(data) {
        return "";
    },
    "expiry_date": function(data) {
        return "";
    },
    "auth_code": function(data) {
        return "";
    },
    "auth_date": function(data) {
        return "";
    },
    "vendor_code": function(data) {
        return "";
    },
    "line_item_number": function(data) {
        // required
        return data.line_item_number;
    },
    "sku": function(data) {
        // required
        return data["Lineitem sku"] || "COULD NOT FIND REQUIRED SKU";
    },
    "item_description": function(data) {
        // required
        return data["Lineitem name"] || "COULD NOT FIND REQUIRED LINE ITEM NAME";
        
    },
    "personalization": function(data) {
        return "";
    },
    "pos1": function(data) {
        return "";
    },
    "pos2": function(data) {
        return "";
    },
    "pos3": function(data) {
        return "";
    },
    "unit_price": function(data) {
        // required
        return data["Lineitem price"] || "COULD NOT FIND REQUIRED ITEM PRICE";
    },
    "item_tax": function(data) {
        return "";
    },
    "shipping_charge": function(data) {
        return "";
    },
    "quantity": function(data) {
        // required
        return data["Lineitem quantity"] || "COULD NOT FIND REQUIRED ITEM QUANTITY";
    },
    "ship_method": function(data) {
        // required
        if (data["Shipping Method"]) {
            var method = data["Shipping Method"].split("-").shift().trim();
            if (method.toLowerCase() === "USPS First Class International".toLowerCase()) {
                method = "USPS First Class Mail";
            }
            return method || "COULD NOT FIND REQUIRED SHIPPING METHOD";
        } else {
            return "";
        }
    },
    "ship_to_name": function(data) {
        // required
        return data["Shipping Name"] || "COULD NOT FIND REQUIRED SHIPPING NAME";
    },
    "ship_to_address1": function(data) {
        // required
        return data["Shipping Address1"];
    },
    "ship_to_address2": function(data) {
        // required
        return data["Shipping Address2"];
    },
    "ship_to_city": function(data) {
        // required
        return data["Shipping City"];
    },
    "ship_to_state": function(data) {
        // required
        return data["Shipping Province"];
    },
    "ship_to_zip": function(data) {
        // required
        // The ZIP needs to be validified. Sometimes it'll be '94107
        var zip = data["Shipping Zip"];
        if (zip) {
            /*
            while (isNaN(parseInt(zip)) && zip.length > 0) {
                zip = zip.substring(1);
            }
            */

            if (zip[0] === "'") {
                zip = zip.substring(1);
            }
            var validZip = zip || "COULD NOT CREATE VALID ZIP, ORIGINAL ZIP MIGHT HAVE INCORRECT CHARACTERS: " + data["Shipping Zip"];
            return validZip;
        } else {
            return "";
        }
    },
    "ship_to_country": function(data) {
        // required
        return data["Shipping Country"];
    },
    "ship_to_phone": function(data) {
        return "";
    },
    "ship_to_company": function(data) {
        return "";
    },
    "order_type": function(data) {
        // required
        return "Retail";
    },
    "warehouse_comments": function(data) {
        return data["Notes"];
    }
    // TODO: the OF total count column
};

var translate = function(order) {
    var translatedOrder = {};
    for (var column in OnFufillmentTranslators) {
        var translateFunc = OnFufillmentTranslators[column];
        translatedOrder[column] = translateFunc(order);
    }
    return translatedOrder;
}

/* EXPORT */
Converter.convert = convert;
module.exports = Converter;

