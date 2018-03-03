gsutil -h "Cache-Control:public,no-cache,must-revalidate" -h "Content-Type:text/html" cp receiver.html gs://castaway/v2/receiver.html
gsutil acl ch -u AllUsers:R gs://castaway/v2/receiver.html
