gsutil -h "Cache-Control:public,no-cache,must-revalidate" -h "Content-Type:text/html" cp receiver.html gs://castaway/receiver.html
gsutil acl ch -u AllUsers:R gs://castaway/receiver.html

gsutil -h "Cache-Control:public,no-cache,must-revalidate" -h "Content-Type:text/html" cp sender.html gs://castaway/sender.html
gsutil acl ch -u AllUsers:R gs://castaway/sender.html

gsutil -h "Cache-Control:public,no-cache,must-revalidate" -h "Content-Type:text/css" cp style.css gs://castaway/style.css
gsutil acl ch -u AllUsers:R gs://castaway/style.css

gsutil -h "Cache-Control:public,no-cache,must-revalidate" -h "Content-Type:text/javascript" cp style.css gs://castaway/common.js
gsutil acl ch -u AllUsers:R gs://castaway/common.js
