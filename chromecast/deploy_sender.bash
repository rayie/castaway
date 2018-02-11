gsutil -h "Cache-Control:public,no-cache,must-revalidate" -h "Content-Type:text/html" cp sender.html gs://castaway/sender.html
gsutil acl ch -u AllUsers:R gs://castaway/sender.html
