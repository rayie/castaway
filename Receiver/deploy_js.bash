gsutil -h "Cache-Control:public,no-cache,must-revalidate" -h "Content-Type:text/javascript" cp common.js gs://castaway/common.js
gsutil acl ch -u AllUsers:R gs://castaway/common.js
