gsutil -h "Cache-Control:public,no-cache,must-revalidate" -h "Content-Type:text/html" cp sender.html gs://castaway/v2/sender.html
gsutil acl ch -u AllUsers:R gs://castaway/v2/sender.html
