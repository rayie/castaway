gsutil -h "Cache-Control:public,no-cache,must-revalidate" -h "Content-Type:text/css" cp css/style.css gs://castaway/v2/css/style.css
gsutil acl ch -u AllUsers:R gs://castaway/v2/css/style.css

