gsutil -h "Cache-Control:public,no-cache,must-revalidate" -h "Content-Type:text/css" cp css/style.css gs://castaway/css/style.css
gsutil acl ch -u AllUsers:R gs://castaway/css/style.css

gsutil -h "Cache-Control:public,no-cache,must-revalidate" -h "Content-Type:text/javascript" cp js/creative.min.js gs://castaway/js/creative.min.js
gsutil acl ch -u AllUsers:R gs://castaway/js/creative.min.js


gsutil -h "Cache-Control:public,no-cache,must-revalidate" -h "Content-Type:text/javascript" cp js/common.js gs://castaway/js/common.js
gsutil acl ch -u AllUsers:R gs://castaway/js/common.js
gsutil -h "Cache-Control:public,no-cache,must-revalidate" -h "Content-Type:text/html" cp receiver.html gs://castaway/v2/receiver.html
gsutil acl ch -u AllUsers:R gs://castaway/v2/receiver.html
gsutil -h "Cache-Control:public,no-cache,must-revalidate" -h "Content-Type:text/html" cp sender.html gs://castaway/v2/sender.html
gsutil acl ch -u AllUsers:R gs://castaway/v2/sender.html
