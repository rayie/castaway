gsutil -h "Cache-Control:public,no-cache,must-revalidate" -h "Content-Type:text/javascript" cp js/common.js gs://castaway/v2/js/common.js
gsutil acl ch -u AllUsers:R gs://castaway/v2/js/common.js
