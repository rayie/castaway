gsutil -h "Cache-Control:public,no-cache,must-revalidate" -h "Content-Type:text/css" cp css/style.css gs://castaway/v2/css/style.css
gsutil acl ch -u AllUsers:R gs://castaway/v2/css/style.css

gsutil -h "Cache-Control:public,no-cache,must-revalidate" -h "Content-Type:text/javascript" cp js/creative.min.js gs://castaway/v2/js/creative.min.js
gsutil acl ch -u AllUsers:R gs://castaway/v2/js/creative.min.js


gsutil -h "Cache-Control:public,no-cache,must-revalidate" -h "Content-Type:text/javascript" cp js/common.js gs://castaway/v2/js/common.js
gsutil acl ch -u AllUsers:R gs://castaway/v2/js/common.js
gsutil -h "Cache-Control:public,no-cache,must-revalidate" -h "Content-Type:text/html" cp receiver.html gs://castaway/v2/receiver.html
gsutil acl ch -u AllUsers:R gs://castaway/v2/receiver.html
gsutil -h "Cache-Control:public,no-cache,must-revalidate" -h "Content-Type:text/html" cp sender.html gs://castaway/v2/sender.html
gsutil acl ch -u AllUsers:R gs://castaway/v2/sender.html
